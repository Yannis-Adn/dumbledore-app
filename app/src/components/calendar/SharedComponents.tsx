import { format, parseISO } from 'date-fns';
import {
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  AlertCircle,
} from 'lucide-react';
import type { PanoramixEvent, PanoramixEventDetail } from '@/lib/panoramix-api';
import type { PROJECT_COLORS } from '@/components/GanttChart';
import { getDayType, isRemoteDay } from '@/lib/planning';
import type { DayType } from '@/lib/planning';
import { getSlotGroupName } from '@/lib/panoramix-utils';
import {
  dateKey,
  dayTypeStyle,
  getEventDisplayColor,
  isAppointmentEvent,
  getActiveSlots,
  isUserSlot,
  moduleCode,
} from './helpers';
import { TIMELINE_START_HOUR, TIMELINE_END_HOUR } from './constants';
import { dayTypeIcon } from './dayTypeIcon';

/* ─── Now Marker ─── */

export function NowMarker({ hourHeight }: { hourHeight: number }) {
  const now = new Date();
  const min = now.getHours() * 60 + now.getMinutes();
  if (min < TIMELINE_START_HOUR * 60 || min >= TIMELINE_END_HOUR * 60) return null;
  const top = ((min - TIMELINE_START_HOUR * 60) / 60) * hourHeight;
  return (
    <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top }}>
      <div className="w-2 h-2 rounded-full bg-danger -ml-1 shrink-0" />
      <div className="flex-1 border-t-2 border-danger/60" />
    </div>
  );
}

/* ─── Day Type Badge ─── */

export function DayTypeBadge({ date, showPlanning = true }: { date: Date; showPlanning?: boolean }) {
  const dk = dateKey(date);
  const type: DayType = showPlanning ? getDayType(dk) : 'normal' as DayType;
  const remote = showPlanning ? isRemoteDay(dk) : false;
  const s = dayTypeStyle(type);
  if (!s.label) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${s.bg} ${s.color}`}>
      {dayTypeIcon(type, remote)}
      {s.label}
      {remote && <span className="text-[10px] opacity-70">· TT</span>}
    </span>
  );
}

/* ─── Event Card (used in MonthView day detail) ─── */

export function EventCard({ event, courseColorMap, eventDetailsMap }: { event: PanoramixEvent; courseColorMap: Map<number, typeof PROJECT_COLORS[0]>; eventDetailsMap: Map<string, PanoramixEventDetail> }) {
  const { bg, isProject } = getEventDisplayColor(event, courseColorMap);
  const room = event.roomsRef?.[0]?.name;
  const registered = !!event.isRegistered;
  const activity = event.moduleRef?.activityRef?.name;
  const code = moduleCode(event);
  const detail = eventDetailsMap.get(event._id);
  const slots = detail && isAppointmentEvent(event) ? getActiveSlots(detail) : null;

  const displayStart = (isAppointmentEvent(event) && event.isRegistered) ? parseISO(event.isRegistered.start) : parseISO(event.start);
  const displayEnd = (isAppointmentEvent(event) && event.isRegistered) ? parseISO(event.isRegistered.end) : parseISO(event.end);

  return (
    <div
      className={`px-3 py-2 rounded-lg transition-opacity ${
        registered ? 'opacity-100 border-l-[3px]' : 'opacity-60 border-l-[3px] border-dashed'
      }`}
      style={{
        borderLeftColor: bg,
        backgroundColor: `${bg}15`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: !isProject && !registered ? '#CD7B72' : bg }}>
              {activity ?? event.title}
            </p>
            {isProject && (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded opacity-70" style={{ backgroundColor: `${bg}20`, color: bg }}>
                {code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-text-muted dark:text-text-dark-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(displayStart, 'HH:mm')} – {format(displayEnd, 'HH:mm')}
            </span>
            {room && (
              <span className="text-[11px] text-text-muted dark:text-text-dark-muted flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {room}
              </span>
            )}
            {slots && (
              <span className="text-[11px] text-text-muted dark:text-text-dark-muted flex items-center gap-1">
                <Users className="w-3 h-3" />
                {slots.length} créneaux
              </span>
            )}
          </div>
        </div>
        {registered ? (
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/15 text-success flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Inscrit
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/15 text-warning flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" />
            Non inscrit
          </span>
        )}
      </div>

      {/* Slot breakdown for appointment events */}
      {slots && slots.length > 0 && (
        <div className="mt-2 pt-1.5 border-t space-y-0.5" style={{ borderColor: `${bg}20` }}>
          {slots.map((slot, idx) => {
            const slotStart = parseISO(slot.start);
            const slotEnd = parseISO(slot.end);
            const mine = isUserSlot(slot, event);
            const groupName = getSlotGroupName(slot);

            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2 py-0.5 rounded text-[10px] ${
                  mine ? 'bg-success/10 font-medium' : ''
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: mine ? 'var(--color-success)' : `${bg}35` }} />
                <span className={mine ? 'text-success' : 'text-text-muted dark:text-text-dark-muted'}>
                  {format(slotStart, 'HH:mm')} – {format(slotEnd, 'HH:mm')}
                </span>
                {groupName && (
                  <span className={`truncate ${mine ? 'text-success/70' : 'text-text-muted/40 dark:text-text-dark-muted/40'}`}>
                    {groupName}
                  </span>
                )}
                {mine && (
                  <span className="shrink-0 ml-auto text-[9px] uppercase text-success">✓ vous</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
