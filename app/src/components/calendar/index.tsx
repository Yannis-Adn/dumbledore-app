import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { Props, View } from './types';
import { VIEW_LABELS } from './constants';
import { buildMonthGrid, buildWeekGrid } from './helpers';
import CalendarLegend from './CalendarLegend';
import EventDetailModal from './EventDetailModal';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';

export default function DashboardCalendar({ panoramixEvents, courseColorMap, eventDetailsMap, showPlanning = true }: Props) {
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'day' : 'week',
  );
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<import('@/lib/panoramix-api').PanoramixEvent | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!calendarRef.current) return;
    if (!document.fullscreenElement) {
      calendarRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const monthDays = useMemo(() => buildMonthGrid(startOfMonth(current)), [current]);
  const weekDays = useMemo(() => buildWeekGrid(current), [current]);

  const goToPrev = useCallback(() => {
    setSelectedDate(null);
    setCurrent((c) => (view === 'day' ? subDays(c, 1) : view === 'week' ? subWeeks(c, 1) : subMonths(c, 1)));
  }, [view]);

  const goToNext = useCallback(() => {
    setSelectedDate(null);
    setCurrent((c) => (view === 'day' ? addDays(c, 1) : view === 'week' ? addWeeks(c, 1) : addMonths(c, 1)));
  }, [view]);

  const goToToday = useCallback(() => {
    setSelectedDate(null);
    setCurrent(new Date());
  }, []);

  const headerLabel = useMemo(() => {
    if (view === 'day') return format(current, 'EEEE d MMMM yyyy', { locale: fr });
    if (view === 'week') {
      const ws = startOfWeek(current, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return ws.getMonth() === we.getMonth()
        ? `${format(ws, 'd')} — ${format(we, 'd MMMM yyyy', { locale: fr })}`
        : `${format(ws, 'd MMM', { locale: fr })} — ${format(we, 'd MMM yyyy', { locale: fr })}`;
    }
    return format(startOfMonth(current), 'MMMM yyyy', { locale: fr });
  }, [current, view]);

  return (
    <div ref={calendarRef} className={`bg-surface dark:bg-surface-dark-dim rounded-2xl shadow-md dark:shadow-none dark:border dark:border-border-dark overflow-hidden ${isFullscreen ? 'flex flex-col !rounded-none' : ''}`}>
      {/* Header */}
      <div className={`border-b border-border/30 dark:border-border-dark/30 ${isFullscreen ? 'px-8 py-5' : 'px-4 sm:px-5 py-3 sm:py-4'}`}>
        {/* Mobile layout: 2 rows */}
        <div className="flex flex-col gap-2 sm:hidden">
          <div className="flex items-center justify-center gap-3">
            <button onClick={goToPrev} className="p-1.5 rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-text dark:text-text-dark text-center capitalize text-sm">
              {headerLabel}
            </span>
            <button onClick={goToNext} className="p-1.5 rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
              Aujourd'hui
            </button>
            <div className="flex items-center bg-surface-dim/60 dark:bg-surface-dark/60 rounded-lg p-0.5">
              {(['day', 'week', 'month'] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`font-medium rounded-md transition-colors px-3 py-1.5 text-xs ${view === v ? 'bg-surface dark:bg-surface-dark-dim text-text dark:text-text-dark shadow-sm' : 'text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark'}`}>
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop layout: original single-row with absolute center */}
        <div className={`relative hidden sm:flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className={`font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors ${isFullscreen ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'}`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={toggleFullscreen}
              className={`rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors ${isFullscreen ? 'p-2' : 'p-1.5'}`}
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 className={isFullscreen ? 'w-5 h-5' : 'w-3.5 h-3.5'} /> : <Maximize2 className={isFullscreen ? 'w-5 h-5' : 'w-3.5 h-3.5'} />}
            </button>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`flex items-center pointer-events-auto ${isFullscreen ? 'gap-5' : 'gap-3'}`}>
              <button onClick={goToPrev} className={`rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors ${isFullscreen ? 'p-2' : 'p-1.5'}`}>
                <ChevronLeft className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
              </button>
              <span className={`font-semibold text-text dark:text-text-dark text-center capitalize ${isFullscreen ? 'text-xl min-w-[300px]' : 'text-base min-w-[220px]'}`}>
                {headerLabel}
              </span>
              <button onClick={goToNext} className={`rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors ${isFullscreen ? 'p-2' : 'p-1.5'}`}>
                <ChevronRight className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
              </button>
            </div>
          </div>
          <div className={`flex items-center bg-surface-dim/60 dark:bg-surface-dark/60 rounded-lg ${isFullscreen ? 'p-1' : 'p-0.5'}`}>
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`font-medium rounded-md transition-colors ${isFullscreen ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'} ${
                  view === v
                    ? 'bg-surface dark:bg-surface-dark-dim text-text dark:text-text-dark shadow-sm'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark'
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
        {/* Legend sidebar */}
        <CalendarLegend panoramixEvents={panoramixEvents} courseColorMap={courseColorMap} isFullscreen={isFullscreen} showPlanning={showPlanning} />

        {/* Calendar content */}
        <div className={`flex-1 min-w-0 ${isFullscreen ? 'flex flex-col overflow-hidden p-6 sm:p-8' : 'p-4 sm:p-5'}`}>
          {view === 'month' && (
            <MonthView days={monthDays} current={current} events={panoramixEvents} courseColorMap={courseColorMap} eventDetailsMap={eventDetailsMap} selectedDate={selectedDate} onSelect={setSelectedDate} onEventClick={setSelectedEvent} showPlanning={showPlanning} />
          )}
          {view === 'week' && <WeekView days={weekDays} events={panoramixEvents} courseColorMap={courseColorMap} eventDetailsMap={eventDetailsMap} onEventClick={setSelectedEvent} isFullscreen={isFullscreen} showPlanning={showPlanning} />}
          {view === 'day' && <DayView date={current} events={panoramixEvents} courseColorMap={courseColorMap} eventDetailsMap={eventDetailsMap} onEventClick={setSelectedEvent} isFullscreen={isFullscreen} showPlanning={showPlanning} />}
        </div>
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          courseColorMap={courseColorMap}
          eventDetailsMap={eventDetailsMap}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
