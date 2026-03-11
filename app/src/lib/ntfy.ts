import type { PanoramixCohortGroup } from './panoramix-api';

const NTFY_BASE = 'https://ntfy.sh';
const NTFY_STORAGE_KEY = 'dumbledore_ntfy';

// ──────────────── Topic Generation ────────────────

function sanitize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-') // non-alnum → dash
    .replace(/^-|-$/g, ''); // trim dashes
}

/** Deterministic 4-char code derived from a string (djb2 hash → base36) */
function deterministicCode(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 4).padEnd(4, '0');
}

/** Generate a personal topic ID: dumbledore-{firstname}-{lastname}-{4chars}
 *  The 4-char suffix is deterministic (based on full name), so it stays
 *  the same across sessions, devices, and token changes. */
export function buildTopicId(firstName: string, lastName: string): string {
  const first = sanitize(firstName);
  const last = sanitize(lastName);
  const code = deterministicCode(`${first}-${last}`);
  return `dumbledore-${first}-${last}-${code}`;
}

/** Generate a cohort key for backend grouping */
export function buildCohortKey(cohortGroup: PanoramixCohortGroup): string {
  const city = sanitize(cohortGroup.city.name);
  const curriculum = sanitize(cohortGroup.curriculum.name);
  const promotion = sanitize(cohortGroup.promotion.name);
  return `${city}-${curriculum}-${promotion}`;
}

export function buildCohortLabel(cohortGroup: PanoramixCohortGroup): string {
  return `${cohortGroup.city.name} / ${cohortGroup.curriculum.name} / ${cohortGroup.promotion.name}`;
}

// ──────────────── Send Notification ────────────────

export async function sendNtfyNotification(
  topicId: string,
  opts: {
    title: string;
    message: string;
    priority?: 1 | 2 | 3 | 4 | 5;
    tags?: string[];
    click?: string;
  },
): Promise<boolean> {
  const payload: Record<string, unknown> = {
    topic: topicId,
    title: opts.title,
    message: opts.message,
    priority: opts.priority ?? 3,
  };
  if (opts.tags?.length) payload.tags = opts.tags;
  if (opts.click) payload.click = opts.click;

  const res = await fetch(`${NTFY_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

// ──────────────── Reminder Presets ────────────────

export const REMINDER_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 heure', value: 60 },
  { label: '2 heures', value: 120 },
  { label: '6 heures', value: 360 },
  { label: '12 heures', value: 720 },
  { label: '24 heures', value: 1440 },
  { label: '48 heures', value: 2880 },
] as const;

export const DEFAULT_REMINDERS = [1440, 60, 5]; // 24h, 1h, 5min

// ──────────────── localStorage Config ────────────────

export interface NtfyConfig {
  enabled: boolean;
  topicId: string;
  cohortKey: string;
  cohortLabel: string;
  reminders: number[]; // minutes before event
  notifyUnregistered: boolean; // notify for events where user is not registered
  notifyNewEvents: boolean; // notify when new events are added to the schedule
}

export function getNtfyConfig(): NtfyConfig | null {
  const raw = localStorage.getItem(NTFY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Migrate old config that didn't have reminders
    if (!Array.isArray(parsed.reminders)) {
      parsed.reminders = DEFAULT_REMINDERS;
    }
    // Migrate old config that didn't have notifyUnregistered
    if (typeof parsed.notifyUnregistered !== 'boolean') {
      parsed.notifyUnregistered = true;
    }
    // Migrate old config that didn't have notifyNewEvents
    if (typeof parsed.notifyNewEvents !== 'boolean') {
      parsed.notifyNewEvents = true;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveNtfyConfig(config: NtfyConfig): void {
  localStorage.setItem(NTFY_STORAGE_KEY, JSON.stringify(config));
}

export function clearNtfyConfig(): void {
  localStorage.removeItem(NTFY_STORAGE_KEY);
}

/** Subscribe URL for QR code.
 *  - Dev (localhost): direct ntfy.sh link (phone can't reach localhost)
 *  - Prod: our smart redirect page with app store fallback */
export function getNtfySubscribeUrl(topicId: string): string {
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return `https://ntfy.sh/${topicId}`;
  }
  return `${origin}/subscribe/${topicId}`;
}
