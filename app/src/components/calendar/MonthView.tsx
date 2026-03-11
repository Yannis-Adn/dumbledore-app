import { format, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PanoramixEvent, PanoramixEventDetail } from '@/lib/panoramix-api';
import type { PROJECT_COLORS } from '@/components/GanttChart';
import { getDayType } from '@/lib/planning';
import type { DayType } from '@/lib/planning';
import {
  dateKey,
  eventsForDay,
  getEventDisplayColor,
  dayTypeStyle,
} from './helpers';
import { DAY_NAMES } from './constants';
import { DayTypeBadge, EventCard } from './SharedComponents';

interface MonthViewProps {
  days: Date[];
  current: Date;
  events: PanoramixEvent[];
  courseColorMap: Map<number, typeof PROJECT_COLORS[0]>;
  eventDetailsMap: Map<string, PanoramixEventDetail>;
  selectedDate: Date | null;
  onSelect: (d: Date | null) => void;
  onEventClick: (e: PanoramixEvent) => void;
  showPlanning?: boolean;
}

export default function MonthView({ days, current, events, courseColorMap, eventDetailsMap, selectedDate, onSelect, onEventClick, showPlanning = true }: MonthViewProps) {
  const monthRef = format(current, 'yyyy-MM');
  const selectedDayEvents = selectedDate ? eventsForDay(events, selectedDate) : [];

  return (
    <>
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-2.5 text-center text-xs font-semibold text-text-muted/60 dark:text-text-dark-muted/60 uppercase tracking-wider">
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const inMonth = format(day, 'yyyy-MM') === monthRef;
          const today = isToday(day);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const dk = dateKey(day);
          const type: DayType = showPlanning ? getDayType(dk) : 'normal' as DayType;
          const s = dayTypeStyle(type);
          const dayEvts = eventsForDay(events, day);

          return (
            <button
              key={i}
              onClick={() => inMonth && onSelect(selected ? null : day)}
              disabled={!inMonth}
              className={`
                relative flex flex-col items-center py-2.5 rounded-xl transition-all
                ${!inMonth ? 'opacity-20 pointer-events-none' : ''}
                ${selected ? 'bg-accent/10 ring-1 ring-accent/30' : 'hover:bg-surface-dim/60 dark:hover:bg-surface-dark/40'}
                ${today && !selected ? 'bg-accent/5' : ''}
                ${!today && !selected && inMonth && s.bg ? s.bg : ''}
              `}
            >
              {inMonth && s.dot && (
                <div className={`absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full ${s.dot}`} />
              )}

              <span className={`
                text-sm font-medium leading-none
                ${today
                  ? 'bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center'
                  : type === 'weekend'
                    ? 'text-text-muted/50 dark:text-text-dark-muted/50 w-8 h-8 flex items-center justify-center'
                    : 'text-text dark:text-text-dark w-8 h-8 flex items-center justify-center'
                }
              `}>
                {day.getDate()}
              </span>

              {dayEvts.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1">
                  {dayEvts.slice(0, 3).map((e, j) => {
                    const { bg } = getEventDisplayColor(e, courseColorMap);
                    return e.isRegistered
                      ? <div key={j} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bg }} />
                      : <div key={j} className="w-1.5 h-1.5 rounded-full border" style={{ borderColor: bg, opacity: 0.5 }} />;
                  })}
                  {dayEvts.length > 3 && (
                    <span className="text-[9px] text-text-muted/40 dark:text-text-dark-muted/40">+{dayEvts.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-border/20 dark:border-border-dark/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-text dark:text-text-dark capitalize">
              {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </span>
            <DayTypeBadge date={selectedDate} showPlanning={showPlanning} />
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="text-xs text-text-muted/50 dark:text-text-dark-muted/50">Aucun événement</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((event) => (
                <div key={event._id} className="cursor-pointer" onClick={() => onEventClick(event)}>
                  <EventCard event={event} courseColorMap={courseColorMap} eventDetailsMap={eventDetailsMap} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
