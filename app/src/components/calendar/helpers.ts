import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns';
import type { PanoramixEvent, PanoramixEventDetail, PanoramixSlot } from '@/lib/panoramix-api';
import type { PROJECT_COLORS } from '@/components/GanttChart';
import type { DayType } from '@/lib/planning';
import { getGandalfCourseId } from '@/lib/panoramix-utils';
import { NEUTRAL_BG, TIMELINE_START_HOUR, TIMELINE_END_HOUR } from './constants';

export function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Get the display color for a Panoramix event */
export function getEventDisplayColor(pe: PanoramixEvent, courseColorMap: Map<number, typeof PROJECT_COLORS[0]>) {
  const courseId = getGandalfCourseId(pe);
  if (courseId !== null) {
    const projectColor = courseColorMap.get(courseId);
    if (projectColor) return { bg: projectColor.bg, isProject: true };
  }
  return { bg: NEUTRAL_BG, isProject: false };
}

export function dayTypeStyle(type: DayType) {
  switch (type) {
    case 'school':
      return { label: 'École', color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/15', dot: 'bg-primary' };
    case 'entreprise':
      return { label: 'Entreprise', color: 'text-warning', bg: 'bg-warning/10 dark:bg-warning/15', dot: 'bg-warning' };
    case 'holiday':
      return { label: 'Férié', color: 'text-danger', bg: 'bg-danger/8 dark:bg-danger/12', dot: 'bg-danger' };
    case 'weekend':
      return { label: 'Weekend', color: 'text-text-muted dark:text-text-dark-muted', bg: '', dot: 'bg-text-muted/30' };
    default:
      return { label: '', color: 'text-text-muted', bg: '', dot: '' };
  }
}

export function buildMonthGrid(current: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }
  return days;
}

export function buildWeekGrid(current: Date): Date[] {
  const ws = startOfWeek(current, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
}

export function eventsForDay(events: PanoramixEvent[], date: Date): PanoramixEvent[] {
  const ds = startOfDay(date);
  const de = endOfDay(date);
  return events
    .filter((e) => parseISO(e.start) < de && parseISO(e.end) > ds)
    .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());
}

export function eventPosition(event: PanoramixEvent, hourHeight: number) {
  const s = parseISO(event.start);
  const e = parseISO(event.end);
  return timePosition(s, e, hourHeight);
}

export function timePosition(start: Date, end: Date, hourHeight: number) {
  const sMin = start.getHours() * 60 + start.getMinutes();
  const eMin = end.getHours() * 60 + end.getMinutes();
  const topMin = Math.max(sMin - TIMELINE_START_HOUR * 60, 0);
  const botMin = Math.min(eMin - TIMELINE_START_HOUR * 60, (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60);
  return {
    top: (topMin / 60) * hourHeight,
    height: Math.max(((botMin - topMin) / 60) * hourHeight, hourHeight * 0.5),
  };
}

export function isAppointmentEvent(event: PanoramixEvent): boolean {
  return event.type === 'appointment' || event.type === 'appointment_multiple';
}

/** Get actual slots (excluding breaks) from event detail */
export function getActiveSlots(detail: PanoramixEventDetail): PanoramixSlot[] {
  return detail.slots.filter((s) => s.type !== 'break');
}

/** Check if a slot matches the user's registered time */
export function isUserSlot(slot: PanoramixSlot, event: PanoramixEvent): boolean {
  if (!event.isRegistered) return false;
  return slot.start === event.isRegistered.start && slot.end === event.isRegistered.end;
}

/** Extract short display name from module code, e.g. "T-DEV-810" */
export function moduleCode(pe: PanoramixEvent): string {
  const code = pe.moduleRef?.code ?? '';
  return code.split('_')[0] || pe.title;
}
