import { useEffect, useCallback, useRef } from 'react';
import {
  format,
  parseISO,
  startOfDay,
  addDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import type { PanoramixEvent, PanoramixEventDetail } from '@/lib/panoramix-api';
import type { PROJECT_COLORS } from '@/components/GanttChart';
import { getSlotGroupName } from '@/lib/panoramix-utils';
import {
  getEventDisplayColor,
  isAppointmentEvent,
  getActiveSlots,
  isUserSlot,
  moduleCode,
} from './helpers';

interface EventDetailModalProps {
  event: PanoramixEvent;
  courseColorMap: Map<number, typeof PROJECT_COLORS[0]>;
  eventDetailsMap: Map<string, PanoramixEventDetail>;
  onClose: () => void;
}

export default function EventDetailModal({ event, courseColorMap, eventDetailsMap, onClose }: EventDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { bg } = getEventDisplayColor(event, courseColorMap);
  const registered = !!event.isRegistered;
  const activity = event.moduleRef?.activityRef?.name;
  const code = moduleCode(event);
  const room = event.roomsRef?.[0]?.name;
  const detail = eventDetailsMap.get(event._id);
  const slots = detail && isAppointmentEvent(event) ? getActiveSlots(detail) : null;
  const displayStart = (isAppointmentEvent(event) && event.isRegistered) ? parseISO(event.isRegistered.start) : parseISO(event.start);
  const displayEnd = (isAppointmentEvent(event) && event.isRegistered) ? parseISO(event.isRegistered.end) : parseISO(event.end);
  const eventDate = parseISO(event.start);
  const edow = eventDate.getDay();
  const mondayOffset = edow === 0 ? -6 : 1 - edow;
  const weekStart = startOfDay(addDays(eventDate, mondayOffset));
  const weekEnd = addDays(weekStart, 7);
  const panoramixUrl = `https://panoramix.epitest.eu/calendar/events/${event._id}/details?view=timeGridWeek&start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}&visible=true`;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={handleBackdrop}>
      <div ref={modalRef} className="animate-modal-in bg-surface dark:bg-surface-dark-dim rounded-2xl shadow-2xl dark:shadow-none dark:border dark:border-border-dark w-full max-w-md overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/20 dark:border-border-dark/20" style={{ backgroundColor: `${bg}10` }}>
          <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: bg }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text dark:text-text-dark truncate">
              {activity ?? event.title}
            </p>
            <span className="text-[10px] font-medium opacity-70" style={{ color: bg }}>
              {code}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Time & Room */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-text dark:text-text-dark flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-text-muted dark:text-text-dark-muted" />
              {format(displayStart, 'EEEE d MMMM', { locale: fr })}
              <span className="font-semibold">{format(displayStart, 'HH:mm')} – {format(displayEnd, 'HH:mm')}</span>
            </span>
          </div>
          {room && (
            <span className="text-xs text-text-muted dark:text-text-dark-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {room}
            </span>
          )}

          {/* Registration status */}
          <div>
            {registered ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-success/12 text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Inscrit
                {isAppointmentEvent(event) && event.isRegistered && (
                  <span className="text-success/70 ml-1">
                    ({format(parseISO(event.isRegistered.start), 'HH:mm')} – {format(parseISO(event.isRegistered.end), 'HH:mm')})
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-warning/12 text-warning">
                <AlertCircle className="w-3.5 h-3.5" />
                Non inscrit
              </span>
            )}
          </div>

          {/* Description */}
          {detail?.description && (
            <p className="text-xs text-text-muted dark:text-text-dark-muted leading-relaxed">
              {detail.description}
            </p>
          )}

          {/* Slot breakdown */}
          {slots && slots.length > 0 && (
            <div className="pt-2 border-t border-border/15 dark:border-border-dark/15">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/60 dark:text-text-dark-muted/60 mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                {slots.length} créneaux
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto gantt-scroll">
                {slots.map((slot, idx) => {
                  const slotStart = parseISO(slot.start);
                  const slotEnd = parseISO(slot.end);
                  const mine = isUserSlot(slot, event);
                  const groupName = getSlotGroupName(slot);

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs ${
                        mine ? 'bg-success/10 border border-success/20' : 'bg-surface-dim/30 dark:bg-surface-dark/30'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: mine ? 'var(--color-success)' : `${bg}40` }} />
                      <span className={`font-medium tabular-nums ${mine ? 'text-success' : 'text-text dark:text-text-dark'}`}>
                        {format(slotStart, 'HH:mm')} – {format(slotEnd, 'HH:mm')}
                      </span>
                      {groupName && (
                        <span className={`truncate text-[11px] ${mine ? 'text-success/70' : 'text-text-muted/60 dark:text-text-dark-muted/60'}`}>
                          {groupName}
                        </span>
                      )}
                      {mine && (
                        <span className="shrink-0 ml-auto text-[10px] font-semibold uppercase text-success">
                          Vous
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/15 dark:border-border-dark/15 flex items-center justify-end gap-2">
          <a
            href={panoramixUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Ouvrir sur Panoramix
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
