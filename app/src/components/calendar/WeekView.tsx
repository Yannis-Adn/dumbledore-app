import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { PanoramixEvent, PanoramixEventDetail } from '@/lib/panoramix-api';
import type { PROJECT_COLORS } from '@/components/GanttChart';
import { getDayType, isRemoteDay } from '@/lib/planning';
import type { DayType } from '@/lib/planning';
import {
  dateKey,
  eventsForDay,
  eventPosition,
  timePosition,
  getEventDisplayColor,
  isAppointmentEvent,
  getActiveSlots,
  dayTypeStyle,
} from './helpers';
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  WEEK_HOUR_HEIGHT,
  FS_WEEK_HOUR_HEIGHT,
} from './constants';
import { NowMarker } from './SharedComponents';
import { dayTypeIcon } from './dayTypeIcon';

interface WeekViewProps {
  days: Date[];
  events: PanoramixEvent[];
  courseColorMap: Map<number, typeof PROJECT_COLORS[0]>;
  eventDetailsMap: Map<string, PanoramixEventDetail>;
  onEventClick: (e: PanoramixEvent) => void;
  isFullscreen?: boolean;
  showPlanning?: boolean;
}

export default function WeekView({ days, events, courseColorMap, eventDetailsMap, onEventClick, isFullscreen = false, showPlanning = true }: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
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
    ? Math.max(containerH / numHours, FS_WEEK_HOUR_HEIGHT)
    : isFullscreen ? FS_WEEK_HOUR_HEIGHT : WEEK_HOUR_HEIGHT;
  const hours = Array.from({ length: numHours }, (_, i) => TIMELINE_START_HOUR + i);
  const totalHeight = hours.length * hourHeight;
  const hourColW = isFullscreen ? '56px' : '42px';

  useEffect(() => {
    if (scrollRef.current && !isFullscreen) {
      const now = new Date();
      const scrollTo = Math.max((now.getHours() - TIMELINE_START_HOUR - 1) * hourHeight, 0);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [days, hourHeight, isFullscreen]);

  return (
    <div className={`-mx-2 px-2 ${isFullscreen ? 'flex flex-col h-full overflow-x-auto' : ''}`}>
      <div className={`${isFullscreen ? 'min-w-[640px] flex flex-col flex-1 min-h-0' : ''}`}>
        {/* Column headers */}
        <div className={`grid gap-px mb-1`} style={{ gridTemplateColumns: `${hourColW} repeat(7, 1fr)` }}>
          <div />
          {days.map((day, i) => {
            const today = isToday(day);
            const dk = dateKey(day);
            const type: DayType = showPlanning ? getDayType(dk) : 'normal' as DayType;
            const remote = showPlanning ? isRemoteDay(dk) : false;
            const s = dayTypeStyle(type);

            return (
              <div key={i} className={`flex flex-col items-center gap-1 rounded-lg ${isFullscreen ? 'py-3 gap-1.5' : 'py-2'} ${
                today ? 'bg-accent/[0.08]' : ''
              }`}>
                <span className={`font-semibold uppercase tracking-wider ${isFullscreen ? 'text-sm' : 'text-xs'} ${
                  today ? 'text-accent' : 'text-text-muted/60 dark:text-text-dark-muted/60'
                }`}>
                  {format(day, 'EEE', { locale: fr })}
                </span>
                <span className={`font-semibold leading-none ${isFullscreen ? 'text-lg' : 'text-base'} ${
                  today
                    ? `bg-accent text-white rounded-full flex items-center justify-center ${isFullscreen ? 'w-9 h-9' : 'w-7 h-7'}`
                    : `text-text dark:text-text-dark flex items-center justify-center ${isFullscreen ? 'w-9 h-9' : 'w-7 h-7'}`
                }`}>
                  {day.getDate()}
                </span>
                {s.label && (
                  <span className={`inline-flex items-center gap-0.5 rounded font-medium ${s.bg} ${s.color} ${isFullscreen ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'}`}>
                    {dayTypeIcon(type, remote)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Timeline grid */}
        <div ref={scrollRef} className={`${isFullscreen ? 'flex-1 overflow-y-auto gantt-scroll' : ''}`}>
          <div className="relative grid gap-px" style={{ gridTemplateColumns: `${hourColW} repeat(7, 1fr)`, height: totalHeight }}>
            {/* Hour labels */}
            <div className="relative">
              {hours.map((h) => (
                <div key={h} className="absolute left-0 right-0" style={{ top: (h - TIMELINE_START_HOUR) * hourHeight }}>
                  <span className={`text-text-muted/40 dark:text-text-dark-muted/40 font-medium tabular-nums ${isFullscreen ? 'text-xs' : 'text-[11px]'}`}>
                    {String(h).padStart(2, '0')}h
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, colIdx) => {
              const dayEvts = eventsForDay(events, day);
              const dk = dateKey(day);
              const type: DayType = showPlanning ? getDayType(dk) : 'normal' as DayType;
              const isEnt = type === 'entreprise';
              const isHol = type === 'holiday';
              const isWe = type === 'weekend';
              const today = isToday(day);

              return (
                <div
                  key={colIdx}
                  className={`relative border-l border-border/10 dark:border-border-dark/10 ${
                    today ? 'bg-accent/[0.06]' : isEnt ? 'bg-warning/[0.04]' : isHol ? 'bg-danger/[0.04]' : isWe ? 'bg-text-muted/[0.02]' : ''
                  }`}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/10 dark:border-border-dark/10"
                      style={{ top: (h - TIMELINE_START_HOUR) * hourHeight }}
                    />
                  ))}

                  {today && <NowMarker hourHeight={hourHeight} />}

                  {dayEvts.map((event) => {
                    const { bg, isProject } = getEventDisplayColor(event, courseColorMap);
                    const registered = !!event.isRegistered;
                    const activity = event.moduleRef?.activityRef?.name;
                    const detail = eventDetailsMap.get(event._id);
                    const slots = detail && isAppointmentEvent(event) ? getActiveSlots(detail) : null;
                    const nameColor = !isProject && !registered ? '#CD7B72' : bg;

                    const pos = (isAppointmentEvent(event) && event.isRegistered)
                      ? timePosition(parseISO(event.isRegistered.start), parseISO(event.isRegistered.end), hourHeight)
                      : eventPosition(event, hourHeight);
                    const displayStart = (isAppointmentEvent(event) && event.isRegistered)
                      ? parseISO(event.isRegistered.start)
                      : parseISO(event.start);
                    const displayEnd = (isAppointmentEvent(event) && event.isRegistered)
                      ? parseISO(event.isRegistered.end)
                      : parseISO(event.end);

                    return (
                      <div
                        key={event._id}
                        className={`absolute left-0.5 right-0.5 overflow-visible cursor-pointer hover:shadow-md transition-shadow ${isFullscreen ? 'rounded-lg px-2 py-1 border-l-[3px]' : 'rounded-md px-1 py-0.5 border-l-2'} ${
                          registered ? '' : 'border-dashed border-danger opacity-70'
                        }`}
                        style={{
                          top: pos.top,
                          height: pos.height,
                          borderLeftColor: registered ? bg : undefined,
                          backgroundColor: registered ? `${bg}18` : 'rgba(239,68,68,0.08)',
                        }}
                        onClick={() => onEventClick(event)}
                        title={`${activity ?? event.title}\n${format(displayStart, 'EEE d MMM', { locale: fr })} · ${format(displayStart, 'HH:mm')} – ${format(displayEnd, 'HH:mm')}${event.roomsRef?.[0]?.name ? `\n${event.roomsRef[0].name}` : ''}${registered ? '\n✓ Inscrit' : '\n⚠ Non inscrit'}${slots ? `\n${slots.length} créneaux` : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`text-text-muted/60 dark:text-text-dark-muted/60 leading-tight shrink-0 ${isFullscreen ? 'text-[11px]' : 'text-[10px]'}`}>
                            {format(displayStart, 'HH:mm')}
                          </span>
                          <p className={`font-semibold truncate leading-tight flex-1 text-center ${isFullscreen ? 'text-xs' : 'text-[11px]'}`} style={{ color: nameColor }}>
                            {activity ?? event.title}
                          </p>
                        </div>
                        {isFullscreen && pos.height > 50 && (
                          <span className={`text-[10px] text-text-muted/50 dark:text-text-dark-muted/50 block mt-0.5`}>
                            {format(displayStart, 'HH:mm')} – {format(displayEnd, 'HH:mm')}
                          </span>
                        )}
                        {registered && (
                          <span className={`absolute -top-1 -right-1 z-30 rounded-full bg-surface dark:bg-surface-dark-dim flex items-center justify-center shadow-sm ${isFullscreen ? 'w-5 h-5' : 'w-3.5 h-3.5'}`}>
                            <CheckCircle2 className={`text-success ${isFullscreen ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} />
                          </span>
                        )}
                        {!registered && (
                          <span className={`absolute -top-1 -right-1 z-30 rounded-full bg-surface dark:bg-surface-dark-dim flex items-center justify-center shadow-sm ${isFullscreen ? 'w-5 h-5' : 'w-3.5 h-3.5'}`}>
                            <AlertCircle className={`text-danger ${isFullscreen ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} />
                          </span>
                        )}
                        {slots && slots.length > 1 && (
                          <span className={`absolute bottom-0.5 right-0.5 font-medium px-1 rounded ${isFullscreen ? 'text-[9px]' : 'text-[8px]'}`} style={{ backgroundColor: `${bg}20`, color: bg }}>
                            {slots.length}cr
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
