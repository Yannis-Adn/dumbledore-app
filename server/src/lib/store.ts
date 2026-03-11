import IORedis from 'ioredis';

const redis = new IORedis.default(process.env.REDIS_URL || 'redis://redis:6379');

/** Strip characters that could cause Redis key collisions or injection */
function sanitizeKey(input: string): string {
  if (input.length > 128) throw new Error('Key too long');
  return input.replace(/[^a-zA-Z0-9._-]/g, '');
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error('Failed to parse Redis data:', raw.slice(0, 100));
    return fallback;
  }
}

export interface NotifRegistration {
  refreshToken: string;
  topicId: string;
  cohortKey: string;
  reminders: number[]; // minutes before event
  notifyUnregistered?: boolean;
  notifyNewEvents?: boolean;
  updatedAt: string; // ISO timestamp
}

export async function upsertRegistration(
  userId: string,
  reg: NotifRegistration,
): Promise<void> {
  await redis.set(`notif:user:${sanitizeKey(userId)}`, JSON.stringify(reg));
  await redis.sadd(`notif:cohort:${sanitizeKey(reg.cohortKey)}`, sanitizeKey(userId));
}

export async function getRegistration(
  userId: string,
): Promise<NotifRegistration | null> {
  const raw = await redis.get(`notif:user:${sanitizeKey(userId)}`);
  if (!raw) return null;
  return safeParse<NotifRegistration | null>(raw, null);
}

export async function getRegistrationsByCohort(
  cohortKey: string,
): Promise<NotifRegistration[]> {
  const memberIds = await redis.smembers(`notif:cohort:${sanitizeKey(cohortKey)}`);
  if (!memberIds.length) return [];

  const results: NotifRegistration[] = [];
  for (const id of memberIds) {
    const raw = await redis.get(`notif:user:${sanitizeKey(id)}`);
    if (raw) {
      const parsed = safeParse<NotifRegistration | null>(raw, null);
      if (parsed) results.push(parsed);
    }
  }
  return results;
}

export async function getAllCohortKeys(): Promise<string[]> {
  const keys = await redis.keys('notif:cohort:*');
  return keys.map((k: string) => k.replace('notif:cohort:', ''));
}

export async function wasReminderSent(
  topicId: string,
  eventId: string,
  reminderMinutes: number,
): Promise<boolean> {
  return (await redis.exists(`notif:sent:${sanitizeKey(topicId)}:${sanitizeKey(eventId)}:${reminderMinutes}`)) === 1;
}

export async function markReminderSent(
  topicId: string,
  eventId: string,
  reminderMinutes: number,
): Promise<void> {
  await redis.set(`notif:sent:${sanitizeKey(topicId)}:${sanitizeKey(eventId)}:${reminderMinutes}`, '1', 'EX', 172800);
}

// ──────────── Gandalf Deadlines ────────────

export interface GandalfDeadline {
  eventId: string;
  name: string;
  courseName: string;
  courseCode: string;
  deadline: number; // unix seconds
}

export async function syncDeadlines(
  topicId: string,
  deadlines: GandalfDeadline[],
): Promise<void> {
  await redis.set(`notif:deadlines:${sanitizeKey(topicId)}`, JSON.stringify(deadlines), 'EX', 1209600);
}

export async function getDeadlines(topicId: string): Promise<GandalfDeadline[]> {
  const raw = await redis.get(`notif:deadlines:${sanitizeKey(topicId)}`);
  if (!raw) return [];
  return safeParse<GandalfDeadline[]>(raw, []);
}

// ──────────── New Event Tracking ────────────

/** Get the set of known event IDs for a cohort. Returns null if never initialized. */
export async function getKnownEventIds(cohortKey: string): Promise<Set<string> | null> {
  const raw = await redis.get(`notif:known-events:${sanitizeKey(cohortKey)}`);
  if (!raw) return null;
  const parsed = safeParse<string[] | null>(raw, null);
  if (!parsed) return null;
  return new Set(parsed);
}

/** Store the current set of event IDs for a cohort (TTL 14 days). */
export async function setKnownEventIds(cohortKey: string, ids: string[]): Promise<void> {
  await redis.set(`notif:known-events:${sanitizeKey(cohortKey)}`, JSON.stringify(ids), 'EX', 1209600);
}
