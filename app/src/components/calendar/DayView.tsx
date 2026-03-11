import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  AlertCircle,
} from 'lucide-react';
import type { PanoramixEvent, PanoramixEventDetail } from '@/lib/panoramix-api';
import type { PROJECT_COLORS } from '@/components/GanttChart';
import { getSlotGroupName } from '@/lib/panoramix-utils';
import {
  eventsForDay,
  eventPosition,
  getEventDisplayColor,
  isAppointmentEvent,
  getActiveSlots,
  isUserSlot,
} from './helpers';
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  HOUR_HEIGHT,
  FS_HOUR_HEIGHT,
} from './constants';
import { NowMarker, DayTypeBadge } from './SharedComponents';

interface DayViewProps {
  date: Date;
  events: PanoramixEvent[];
  courseColorMap: Map<number, typeof PROJECT_COLORS[0]>;
  eventDetailsMap: Map<string, PanoramixEventDetail>;
  onEventClick: (e: PanoramixEvent) => void;
  isFullscreen?: boolean;
  showPlanning?: boolean;
}

export default function DayView({ date, events, courseColorMap, eventDetailsMap, onEventClick, isFullscreen = false, showPlanning = true }: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayEvents = eventsForDay(events, date);
  const numHours = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
  const [containerH, setContainerH] = useState(0);

  useLayoutEffect(() => {
    if (!isFullscreen || !scrollRef.current) { setContainerH(0); return; }
    const el = scrollRef.current;
    const ro = new ResizeObserver(([entry]) => setContainerH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isFullscreen]);

  const hourHeight = isFullscreen && containerH > 0
    ? Math.max(containerH / numHours, FS_HOUR_HEIGHT)
    : isFullscreen ? FS_HOUR_HEIGHT : HOUR_HEIGHT;
  const hours = Array.from({ length: numHours }, (_, i) => TIMELINE_START_HOUR + i);
  const totalHeight = hours.length * hourHeight;

  useEffect(() => {
    if (scrollRef.current && !isFullscreen) {
      const now = new Date();
      const scrollTo = Math.max((now.getHours() - TIMELINE_START_HOUR - 1) * hourHeight, 0);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [date, hourHeight, isFullscreen]);

  const hourLabelW = isFullscreen ? 'w-14' : 'w-10';
  const eventLeft = isFullscreen ? 'left-16' : 'left-12';

  return (
    <div className={isFullscreen ? 'flex flex-col h-full' : ''}>
      <div className={`flex items-center justify-between ${isFullscreen ? 'mb-6' : 'mb-4'}`}>
        <DayTypeBadge date={date} showPlanning={showPlanning} />
        <span className={`text-text-muted dark:text-text-dark-muted ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
          {dayEvents.length} événement{dayEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {dayEvents.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-2">
          <span className="text-5xl font-bold text-text/8 dark:text-text-dark/8">{date.getDate()}</span>
          <p className={`text-text-muted/50 dark:text-text-dark-muted/50 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>Aucun événement</p>
        </div>
      ) : (
        <div ref={scrollRef} className={`relative ${isFullscreen ? 'flex-1 overflow-y-auto gantt-scroll' : ''}`} style={{ height: isFullscreen ? undefined : totalHeight }}>
          <div className="max-w-2xl mx-auto relative" style={{ height: totalHeight }}>
            {hours.map((h) => (
              <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: (h - TIMELINE_START_HOUR) * hourHeight }}>
                <span className={`text-text-muted/40 dark:text-text-dark-muted/40 shrink-0 -mt-1.5 text-right pr-2 font-medium tabular-nums ${hourLabelW} ${isFullscreen ? 'text-sm' : 'text-[10px]'}`}>
                  {String(h).padStart(2, '0')}:00
                </span>
                <div className="flex-1 border-t border-border/15 dark:border-border-dark/15" />
              </div>
            ))}

            {isToday(date) && (
              <div className={`absolute right-0 ${isFullscreen ? 'left-14' : 'left-10'}`}>
                <NowMarker hourHeight={hourHeight} />
              </div>
            )}

            {dayEvents.map((event) => {
              const { bg, isProject } = getEventDisplayColor(event, courseColorMap);
              const registered = !!event.isRegistered;
              const activity = event.moduleRef?.activityRef?.name;
              const detail = eventDetailsMap.get(event._id);
              const slots = detail && isAppointmentEvent(event) ? getActiveSlots(detail) : null;
              const nameColor = !isProject && !registered ? '#CD7B72' : bg;

              // Appointment event with slots: show slot group
              if (slots && slots.length > 0) {
                const pos = eventPosition(event, hourHeight);
                return (
                  <div
                    key={event._id}
                    className={`absolute ${eventLeft} right-2 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
                    style={{ top: pos.top, height: pos.height, backgroundColor: `${bg}08` }}
                    onClick={() => onEventClick(event)}
                  >
                    {/* Event header */}
                    <div className={`sticky top-0 z-10 flex items-center gap-2 border-b ${isFullscreen ? 'px-4 py-2' : 'px-3 py-1'}`} style={{ borderColor: `${bg}25`, backgroundColor: `${bg}12` }}>
                      <p className={`font-semibold truncate ${isFullscreen ? 'text-sm' : 'text-[11px]'}`} style={{ color: nameColor }}>
                        {activity ?? event.title}
                      </p>
                      <span className={`shrink-0 font-medium rounded ${isFullscreen ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'}`} style={{ backgroundColor: `${bg}15`, color: bg }}>
                        <Users className={`inline -mt-0.5 mr-0.5 ${isFullscreen ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} />
                        {slots.length} créneaux
                      </span>
                      {!registered && (
                        <span className={`shrink-0 font-medium rounded bg-warning/15 text-warning flex items-center gap-0.5 ${isFullscreen ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'}`}>
                          <AlertCircle className={isFullscreen ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} />
                          Non inscrit
                        </span>
                      )}
                    </div>
                    {/* Individual slots */}
                    <div className="overflow-y-auto h-full px-1 py-0.5" style={{ maxHeight: pos.height - (isFullscreen ? 40 : 28) }}>
                      {slots.map((slot, idx) => {
                        const slotStart = parseISO(slot.start);
                        const slotEnd = parseISO(slot.end);
                        const mine = isUserSlot(slot, event);
                        const groupName = getSlotGroupName(slot);

                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 rounded-md transition-colors ${isFullscreen ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-[11px]'} ${
                              mine
                                ? 'bg-success/12 border border-success/25'
                                : 'hover:bg-surface-dim/40 dark:hover:bg-surface-dark/40'
                            }`}
                          >
                            <span className={`rounded-full shrink-0 ${isFullscreen ? 'w-2 h-2' : 'w-1.5 h-1.5'}`} style={{ backgroundColor: mine ? 'var(--color-success)' : `${bg}40` }} />
                            <span className={`font-medium tabular-nums ${mine ? 'text-success' : 'text-text-muted dark:text-text-dark-muted'}`}>
                              {format(slotStart, 'HH:mm')} – {format(slotEnd, 'HH:mm')}
                            </span>
                            {groupName && (
                              <span className={`truncate ${mine ? 'text-success/80' : 'text-text-muted/50 dark:text-text-dark-muted/50'}`}>
                                {groupName}
                              </span>
                            )}
                            {mine && (
                              <span className={`shrink-0 ml-auto font-semibold uppercase text-success bg-success/10 rounded ${isFullscreen ? 'text-[10px] px-2 py-1' : 'text-[9px] px-1.5 py-0.5'}`}>
                                Votre créneau
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Regular event (course, or appointment without detail)
              const pos = eventPosition(event, hourHeight);
              const start = parseISO(event.start);
              const end = parseISO(event.end);
              const room = event.roomsRef?.[0]?.name;

              return (
                <div
                  key={event._id}
                  className={`absolute ${eventLeft} right-2 rounded-lg overflow-hidden transition-shadow hover:shadow-md cursor-pointer ${isFullscreen ? 'px-4 py-2 border-l-4' : 'px-3 py-1.5 border-l-[3px]'} ${
                    registered ? '' : 'border-dashed opacity-45'
                  }`}
                  style={{ top: pos.top, height: pos.height, borderLeftColor: bg, backgroundColor: `${bg}18` }}
                  onClick={() => onEventClick(event)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold truncate ${isFullscreen ? 'text-base' : 'text-sm'}`} style={{ color: nameColor }}>
                      {activity ?? event.title}
                    </p>
                    {registered ? (
                      <CheckCircle2 className={`shrink-0 text-success ${isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                    ) : (
                      <span className={`shrink-0 font-medium rounded bg-warning/15 text-warning flex items-center gap-0.5 ${isFullscreen ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'}`}>
                        <AlertCircle className={isFullscreen ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} />
                        Non inscrit
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-3 ${isFullscreen ? 'mt-1' : 'mt-0.5'}`}>
                    <span className={`text-text-muted dark:text-text-dark-muted flex items-center gap-1 ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                      <Clock className={isFullscreen ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
                      {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                    </span>
                    {room && (
                      <span className={`text-text-muted dark:text-text-dark-muted flex items-center gap-1 ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                        <MapPin className={isFullscreen ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
                        {room}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
