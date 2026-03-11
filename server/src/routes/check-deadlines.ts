import { Router, type Request, type Response } from 'express';
import {
  getAllCohortKeys,
  getRegistrationsByCohort,
  wasReminderSent,
  markReminderSent,
  getDeadlines,
  getKnownEventIds,
  setKnownEventIds,
  type NotifRegistration,
} from '../lib/store.js';
import {
  PanoramixServerAPI,
  type PanoramixEventServer,
  type PanoramixEventDetailServer,
  type PanoramixSlotServer,
} from '../lib/panoramix-server.js';
import { sendNotification } from '../lib/ntfy-server.js';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function stripModuleName(name: string): string {
  return name.replace(/^T-\w+-\d+_\w+\s+T-\w+-\d+\s*-\s*/, '');
}

/** Strip the cohort/year suffix from module code: "T-DEV-810_msc2027" → "T-DEV-810" */
function shortModuleCode(code: string): string {
  return code.split('_')[0] || code;
}

/** Try each registration's token (most recently updated first) until one works */
async function findWorkingApi(registrations: NotifRegistration[]): Promise<PanoramixServerAPI | null> {
  const sorted = [...registrations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  for (const reg of sorted) {
    const candidate = new PanoramixServerAPI(reg.refreshToken);
    if (await candidate.init()) return candidate;
  }
  return null;
}

/** Decode Panoramix user ID and login from a JWT (works even if expired). */
function decodeJwtPayload(jwt: string): { _id: string; login: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
    if (payload._id && payload.login) return { _id: payload._id, login: payload.login };
    return null;
  } catch {
    return null;
  }
}

/** Check if a user is registered in a specific slot (handles both individual and group registrations). */
function isUserInSlot(slot: PanoramixSlotServer, userId: string): boolean {
  if (slot.type === 'break') return false;
  const inStudents = slot.registeredStudents?.some(
    (r) => r._id === userId || r.members?.some((m) => m._id === userId),
  );
  if (inStudents) return true;
  const inStaff = slot.registeredStaff?.some(
    (r) => r._id === userId || r.members?.some((m) => m._id === userId),
  );
  return !!inStaff;
}

/** Find the slot where a specific user is registered within an event detail. */
function findUserSlot(detail: PanoramixEventDetailServer, userId: string): PanoramixSlotServer | null {
  return detail.slots.find((slot) => isUserInSlot(slot, userId)) ?? null;
}

/** Check if a user is registered in the event at all (top-level or any slot). */
function isUserRegistered(detail: PanoramixEventDetailServer, userId: string): boolean {
  // For course-type events: check top-level registeredStudents/Staff
  if (detail.registeredStudents?.some((r) => r._id === userId || r.members?.some((m) => m._id === userId))) {
    return true;
  }
  if (detail.registeredStaff?.some((r) => r._id === userId || r.members?.some((m) => m._id === userId))) {
    return true;
  }
  // For appointment-type events: check slots
  return detail.slots.some((slot) => isUserInSlot(slot, userId));
}

/** Build a readable notification title from event data. */
function buildEventTitle(event: PanoramixEventServer): string {
  const moduleName = event.moduleRef?.name
    ? stripModuleName(event.moduleRef.name)
    : '';
  const code = event.moduleRef?.code ? shortModuleCode(event.moduleRef.code) : '';
  const activityName = event.moduleRef?.activityRef?.name || '';

  const sessionLabel = activityName || event.title || '';
  const projectName = moduleName || event.title;

  const parts: string[] = [];
  if (sessionLabel && sessionLabel !== projectName) {
    parts.push(sessionLabel);
  }
  parts.push(projectName);

  const name = parts.join(' · ');
  return code ? `${name} — ${code}` : name;
}

/** Core logic — called by both the HTTP route and the cron job */
export async function checkDeadlines() {
  const cohortKeys = await getAllCohortKeys();
  const results: Record<string, { sent: number; expired: boolean }> = {};
  const allRegistrations: NotifRegistration[] = [];

  for (const cohortKey of cohortKeys) {
    results[cohortKey] = { sent: 0, expired: false };
    const registrations = await getRegistrationsByCohort(cohortKey);
    allRegistrations.push(...registrations);
    if (!registrations.length) continue;

    const api = await findWorkingApi(registrations);
    if (!api) {
      results[cohortKey].expired = true;
      continue;
    }

    const now = new Date();
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    try {
      const cohortEvents = await api.getEvents(now.toISOString(), end.toISOString());

      // Cache event details to avoid re-fetching for each user in the cohort
      const detailCache = new Map<string, PanoramixEventDetailServer | null>();

      for (const reg of registrations) {
        if (!reg.reminders?.length) continue;

        const wantsOnlyRegistered = reg.notifyUnregistered === false;
        const userInfo = decodeJwtPayload(reg.refreshToken);

        // Try to fetch with the user's own token for their personal isRegistered data
        let userEvents = cohortEvents;
        let userTokenWorked = false;
        try {
          const userApi = new PanoramixServerAPI(reg.refreshToken);
          if (await userApi.init()) {
            userEvents = await userApi.getEvents(now.toISOString(), end.toISOString());
            userTokenWorked = true;
          }
        } catch {
          // User token failed — fall back to cohort events + detail lookup
        }

        for (const event of userEvents) {
          // ── Determine user's registration status and slot time ──

          let registeredSlotStart: string | null = null;
          let registeredSlotEnd: string | null = null;
          let userIsRegistered: boolean | null = null;

          if (userTokenWorked) {
            // User's own token: isRegistered is reliable
            if (event.isRegistered && typeof event.isRegistered === 'object') {
              registeredSlotStart = event.isRegistered.start;
              registeredSlotEnd = event.isRegistered.end;
              userIsRegistered = true;
            } else {
              userIsRegistered = !!event.isRegistered;
            }
          } else if (userInfo) {
            // Fallback: use cohort API to get event detail and find user in slots
            const isAppointment = event.type === 'appointment' || event.type === 'appointment_multiple';

            if (isAppointment) {
              if (!detailCache.has(event._id)) {
                try {
                  detailCache.set(event._id, await api.getEventDetail(event._id));
                } catch {
                  detailCache.set(event._id, null);
                }
              }
              const detail = detailCache.get(event._id);
              if (detail) {
                const slot = findUserSlot(detail, userInfo._id);
                if (slot) {
                  registeredSlotStart = slot.start;
                  registeredSlotEnd = slot.end;
                  userIsRegistered = true;
                } else {
                  userIsRegistered = false;
                }
              }
            } else {
              // Course-type: check top-level registration list
              if (!detailCache.has(event._id)) {
                try {
                  detailCache.set(event._id, await api.getEventDetail(event._id));
                } catch {
                  detailCache.set(event._id, null);
                }
              }
              const detail = detailCache.get(event._id);
              userIsRegistered = detail ? isUserRegistered(detail, userInfo._id) : null;
            }
          }

          // Filter: skip unregistered events if the user doesn't want them
          if (wantsOnlyRegistered && userIsRegistered === false) continue;

          const relevantStart = registeredSlotStart ?? event.start;
          const relevantEnd = registeredSlotEnd ?? event.end;

          const eventStart = new Date(relevantStart);
          const minutesUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60);

          if (minutesUntil < 0) continue;

          for (const reminderMinutes of reg.reminders) {
            if (minutesUntil > reminderMinutes) continue;

            const dedupeKey = event._id;
            if (await wasReminderSent(reg.topicId, dedupeKey, reminderMinutes)) continue;

            const title = buildEventTitle(event);
            const timeRange = `${formatTime(relevantStart)} – ${formatTime(relevantEnd)}`;
            const room = event.roomsRef?.[0]?.name;
            const messageParts = [timeRange, room ? `Salle ${room}` : ''].filter(Boolean);

            await sendNotification(reg.topicId, {
              title,
              message: messageParts.join(' · '),
              priority: reminderMinutes <= 15 ? 4 : 3,
              tags: ['calendar'],
            });

            await markReminderSent(reg.topicId, dedupeKey, reminderMinutes);
            results[cohortKey].sent++;
          }
        }
      }
    } catch (e) {
      console.error(`Error processing cohort ${cohortKey}:`, e);
    }
  }

  // ──────────── Gandalf deadline notifications ────────────
  const GANDALF_REMINDER_MINUTES = 10080; // 7 days
  let gandalfSent = 0;
  const now = new Date();

  for (const reg of allRegistrations) {
    try {
      const deadlines = await getDeadlines(reg.topicId);
      for (const dl of deadlines) {
        const deadlineDate = new Date(dl.deadline * 1000);
        const daysUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (daysUntil < 0 || daysUntil > 7) continue;
        if (await wasReminderSent(reg.topicId, `gandalf-${dl.eventId}`, GANDALF_REMINDER_MINUTES))
          continue;

        const deadlineTime = formatTime(deadlineDate.toISOString());
        const daysRound = Math.round(daysUntil);
        const timeLabel = daysRound >= 7 ? 'Dans une semaine' : daysRound >= 2 ? `Dans ${daysRound} jours` : daysRound === 1 ? 'Demain' : "Aujourd'hui";
        const courseCode = dl.courseCode ? shortModuleCode(dl.courseCode) : '';
        await sendNotification(reg.topicId, {
          title: `Rendu — ${dl.courseName}${courseCode ? `, ${courseCode}` : ''}`,
          message: `${timeLabel}, ${deadlineTime}`,
          priority: daysUntil <= 2 ? 4 : 3,
          tags: ['triangular_flag_on_post'],
        });

        await markReminderSent(reg.topicId, `gandalf-${dl.eventId}`, GANDALF_REMINDER_MINUTES);
        gandalfSent++;
      }
    } catch (e) {
      console.error(`Error checking Gandalf deadlines for ${reg.topicId}:`, e);
    }
  }

  return { ok: true, results, gandalfSent };
}

// ──────────── New event detection ────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Detect newly added Panoramix events per cohort (14-day window). */
export async function checkNewEvents() {
  const cohortKeys = await getAllCohortKeys();
  let totalNew = 0;

  for (const cohortKey of cohortKeys) {
    const registrations = await getRegistrationsByCohort(cohortKey);
    if (!registrations.length) continue;

    const api = await findWorkingApi(registrations);
    if (!api) continue;

    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    try {
      const events = await api.getEvents(now.toISOString(), end.toISOString());
      const currentIds = events.map((e) => e._id);
      const knownIds = await getKnownEventIds(cohortKey);

      // First run: store current state without notifying
      if (knownIds === null) {
        await setKnownEventIds(cohortKey, currentIds);
        continue;
      }

      const newEvents = events.filter((e) => !knownIds.has(e._id));

      if (newEvents.length > 0) {
        for (const event of newEvents) {
          const title = buildEventTitle(event);
          const dateStr = formatDate(event.start);
          const timeRange = `${formatTime(event.start)} – ${formatTime(event.end)}`;

          for (const reg of registrations) {
            if (reg.notifyNewEvents === false) continue;
            await sendNotification(reg.topicId, {
              title: `Nouvel event — ${title}`,
              message: `${dateStr}, ${timeRange}`,
              priority: 3,
              tags: ['new', 'calendar'],
            });
          }
          totalNew++;
        }

        await setKnownEventIds(cohortKey, currentIds);
      } else {
        // Update stored IDs to refresh TTL and remove past events
        await setKnownEventIds(cohortKey, currentIds);
      }
    } catch (e) {
      console.error(`Error checking new events for cohort ${cohortKey}:`, e);
    }
  }

  return { newEvents: totalNew };
}

// ──────────── HTTP route handler ────────────

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await checkDeadlines();
    res.status(200).json(result);
  } catch (e) {
    console.error('check-deadlines error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
