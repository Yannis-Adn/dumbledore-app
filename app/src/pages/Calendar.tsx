import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import type { PanoramixEvent } from '@/lib/panoramix-api';
import { getDayType, getPlanningBlocks, isRemoteDay, hasPlanningData, type DayType, type PlanningBlock } from '@/lib/planning';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  differenceInCalendarDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  Check,
  Laptop,
  Building2,
  GraduationCap,
  CalendarOff,
  Briefcase,
} from 'lucide-react';

// ── Types ──

interface MergedEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  module?: string;
  moduleCode?: string;
  room?: string;
  city?: string;
  type: string;
  registrationType?: string;
  isRegistered: boolean;
  registeredSlot?: { start: string; end: string };
  source: 'panoramix';
}

// ── Helpers ──

const DAY_TYPE_STYLES: Record<DayType, { bg: string; dot: string; label: string }> = {
  school:     { bg: 'bg-accent/8 dark:bg-accent/6',   dot: 'bg-accent',  label: 'École' },
  entreprise: { bg: 'bg-warning/8 dark:bg-warning/6',  dot: 'bg-warning', label: 'Entreprise' },
  holiday:    { bg: 'bg-danger/8 dark:bg-danger/6',    dot: 'bg-danger',  label: 'Férié' },
  weekend:    { bg: '',                                 dot: '',           label: 'Weekend' },
  normal:     { bg: '',                                 dot: '',           label: '' },
};

function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} — ${formatTime(end)}`;
}

function stripModulePrefix(name: string): string {
  return name.replace(/^T-\w+-\d+_\w+\s+T-\w+-\d+\s*-\s*/, '');
}

function buildMonthGrid(current: Date): Date[] {
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

// ── Main Component ──

export default function Calendar() {
  const { panoramixApi, curriculum, handleApiError } = useAuth();
  const showPlanning = hasPlanningData(curriculum);
  const [current, setCurrent] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [panoramixEvents, setPanoramixEvents] = useState<PanoramixEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventDescriptions, setEventDescriptions] = useState<Map<string, string>>(new Map());

  // Fetch Panoramix events for the visible month range
  useEffect(() => {
    if (!panoramixApi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const monthStart = startOfMonth(current);
    const monthEnd = endOfMonth(current);
    // Pad by one week on each side for the grid
    const fetchStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const fetchEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    panoramixApi
      .getEvents(fetchStart.toISOString(), fetchEnd.toISOString())
      .then((events) => {
        if (!cancelled) setPanoramixEvents(events);
      })
      .catch((err) => {
        handleApiError(err);
        if (!cancelled) setPanoramixEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [panoramixApi, current]);

  // Merge Panoramix events into our unified format
  const mergedEvents = useMemo((): MergedEvent[] => {
    return panoramixEvents.map((ev) => ({
      id: ev._id,
      title: ev.title,
      start: parseISO(ev.start),
      end: parseISO(ev.end),
      module: ev.moduleRef?.name ? stripModulePrefix(ev.moduleRef.name) : undefined,
      moduleCode: ev.moduleRef?.code?.split('_')[0],
      room: ev.roomsRef?.[0]?.name,
      city: ev.roomsRef?.[0]?.city,
      type: ev.type,
      registrationType: ev.registrationType,
      isRegistered: !!ev.isRegistered,
      registeredSlot: ev.isRegistered && typeof ev.isRegistered === 'object'
        ? ev.isRegistered
        : undefined,
      source: 'panoramix',
    }));
  }, [panoramixEvents]);

  // Build calendar grid
  const gridDays = useMemo(() => buildMonthGrid(current), [current]);

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map = new Map<string, MergedEvent[]>();
    for (const ev of mergedEvents) {
      const key = format(ev.start, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    // Sort events by start time within each day
    for (const events of map.values()) {
      events.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    return map;
  }, [mergedEvents]);

  const goToMonth = useCallback((dir: -1 | 1) => {
    setSelectedDate(null);
    setCurrent((c) => dir === -1 ? subMonths(c, 1) : addMonths(c, 1));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(null);
    setCurrent(startOfMonth(new Date()));
  }, []);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) ?? [];
  }, [selectedDate, eventsByDate]);

  // Fetch event details (for descriptions) when selected day changes
  useEffect(() => {
    if (!panoramixApi || selectedEvents.length === 0) return;
    let cancelled = false;

    const ids = selectedEvents.map((e) => e.id);
    Promise.allSettled(ids.map((id) => panoramixApi.getEventDetail(id))).then((results) => {
      if (cancelled) return;
      const next = new Map<string, string>();
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.description) {
          next.set(ids[i], r.value.description);
        }
      });
      if (next.size > 0) setEventDescriptions((prev) => new Map([...prev, ...next]));
    });

    return () => { cancelled = true; };
  }, [panoramixApi, selectedEvents]);

  const selectedDayType = useMemo(() => {
    if (!selectedDate) return 'normal' as DayType;
    if (!showPlanning) return 'normal' as DayType;
    return getDayType(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate, showPlanning]);

  const planningBlocks = useMemo(() => showPlanning ? getPlanningBlocks() : [], [showPlanning]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-text dark:text-text-dark">
          Calendrier
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => goToMonth(-1)}
            className="p-2 rounded-xl text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface dark:hover:bg-surface-dark-dim transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-text dark:text-text-dark min-w-[150px] text-center capitalize">
            {format(current, 'MMMM yyyy', { locale: fr })}
          </span>
          <button
            onClick={() => goToMonth(1)}
            className="p-2 rounded-xl text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface dark:hover:bg-surface-dark-dim transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Year Timeline (only for MSc Pro 1) */}
      {showPlanning && <YearTimeline blocks={planningBlocks} currentMonth={current} />}

      {/* Calendar + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Calendar Grid */}
        <div className="bg-surface dark:bg-surface-dark-dim rounded-2xl border border-border dark:border-border-dark overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          )}
          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-border dark:border-border-dark">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((name) => (
              <div
                key={name}
                className="py-3 text-center text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider"
              >
                {name}
              </div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7">
            {gridDays.map((day, i) => {
              const inMonth = isSameMonth(day, current);
              const today = isToday(day);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayType = showPlanning ? getDayType(dateStr) : 'normal' as DayType;
              const dayStyle = DAY_TYPE_STYLES[dayType];
              const events = eventsByDate.get(dateStr) ?? [];
              const remote = showPlanning ? isRemoteDay(dateStr) : false;

              return (
                <button
                  key={i}
                  onClick={() => inMonth && setSelectedDate(selected ? null : day)}
                  className={`
                    relative min-h-[90px] sm:min-h-[110px] p-1.5 border-b border-r border-border/20 dark:border-border-dark/20 text-left transition-all
                    ${!inMonth ? 'opacity-20 pointer-events-none' : ''}
                    ${selected ? 'ring-2 ring-inset ring-primary/40 bg-primary/5 dark:bg-primary/5' : ''}
                    ${!selected && inMonth ? dayStyle.bg : ''}
                    ${!selected && inMonth && dayType === 'normal' ? 'hover:bg-surface-dim/50 dark:hover:bg-surface-dark/30' : ''}
                    ${!selected && inMonth && dayType !== 'normal' ? 'hover:brightness-95 dark:hover:brightness-110' : ''}
                  `}
                >
                  {/* Day number + indicators */}
                  <div className="flex items-center gap-1 mb-1">
                    <span
                      className={`
                        text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                        ${today ? 'bg-accent text-white' : 'text-text dark:text-text-dark'}
                      `}
                    >
                      {day.getDate()}
                    </span>
                    {dayType === 'entreprise' && !selected && (
                      <Briefcase className="w-3 h-3 text-warning/60" />
                    )}
                    {dayType === 'school' && !selected && (
                      <GraduationCap className="w-3 h-3 text-accent/60" />
                    )}
                    {dayType === 'holiday' && (
                      <CalendarOff className="w-3 h-3 text-danger/60" />
                    )}
                    {remote && (
                      <Laptop className="w-3 h-3 text-primary/60" />
                    )}
                  </div>

                  {/* Events */}
                  {events.length > 0 && (
                    <div className="space-y-0.5">
                      {events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`
                            text-[10px] leading-tight truncate px-1.5 py-0.5 rounded-md font-medium
                            ${ev.isRegistered
                              ? 'bg-primary/15 text-primary-dark dark:text-primary-light'
                              : 'bg-accent/10 text-accent dark:text-accent-light'
                            }
                          `}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[10px] text-text-muted dark:text-text-dark-muted pl-1">
                          +{events.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {selectedDate ? (
            <SidebarDetail
              date={selectedDate}
              dayType={selectedDayType}
              events={selectedEvents}
              descriptions={eventDescriptions}
              showPlanning={showPlanning}
              onClose={() => setSelectedDate(null)}
            />
          ) : (
            <SidebarEmpty />
          )}
          {showPlanning && <Legend />}
        </div>
      </div>
    </div>
  );
}

// ── Year Timeline ──

function YearTimeline({ blocks, currentMonth }: { blocks: PlanningBlock[]; currentMonth: Date }) {
  const yearStart = parseISO('2026-01-01');
  const yearEnd = parseISO('2026-12-31');
  const totalDays = differenceInCalendarDays(yearEnd, yearStart) + 1;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, i, 1);
    return {
      label: format(d, 'MMM', { locale: fr }),
      offset: differenceInCalendarDays(d, yearStart) / totalDays * 100,
    };
  });

  return (
    <div className="bg-surface dark:bg-surface-dark-dim rounded-2xl border border-border dark:border-border-dark p-4">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-xs font-semibold text-text dark:text-text-dark uppercase tracking-wider">
          Planning alternance 2026
        </h3>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted dark:text-text-dark-muted">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent/60" /> École
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted dark:text-text-dark-muted">
            <span className="w-2.5 h-2.5 rounded-sm bg-warning/40" /> Entreprise
          </span>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative h-8 rounded-lg bg-surface-dim dark:bg-surface-dark overflow-hidden">
        {/* Blocks */}
        {blocks.map((block, i) => {
          const start = differenceInCalendarDays(parseISO(block.start), yearStart);
          const end = differenceInCalendarDays(parseISO(block.end), yearStart);
          const left = (start / totalDays) * 100;
          const width = ((end - start + 1) / totalDays) * 100;

          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 ${
                block.type === 'school'
                  ? 'bg-accent/50 dark:bg-accent/30'
                  : 'bg-warning/30 dark:bg-warning/15'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}

        {/* Current month highlight */}
        {currentMonth.getFullYear() === 2026 && (
          <div
            className="absolute top-0 bottom-0 ring-2 ring-primary rounded-sm z-10"
            style={{
              left: `${(differenceInCalendarDays(monthStart, yearStart) / totalDays) * 100}%`,
              width: `${(differenceInCalendarDays(monthEnd, monthStart) + 1) / totalDays * 100}%`,
            }}
          />
        )}

        {/* Today marker */}
        {isToday(new Date()) && new Date().getFullYear() === 2026 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-danger z-20"
            style={{
              left: `${(differenceInCalendarDays(new Date(), yearStart) / totalDays) * 100}%`,
            }}
          />
        )}
      </div>

      {/* Month labels */}
      <div className="relative h-4 mt-1">
        {months.map((m) => (
          <span
            key={m.label}
            className="absolute text-[9px] font-medium text-text-muted/60 dark:text-text-dark-muted/60 capitalize"
            style={{ left: `${m.offset}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar: Day Detail ──

function SidebarDetail({
  date,
  dayType,
  events,
  descriptions,
  showPlanning = true,
  onClose,
}: {
  date: Date;
  dayType: DayType;
  events: MergedEvent[];
  descriptions: Map<string, string>;
  showPlanning?: boolean;
  onClose: () => void;
}) {
  const dayStyle = DAY_TYPE_STYLES[dayType];
  const remote = showPlanning ? isRemoteDay(format(date, 'yyyy-MM-dd')) : false;

  return (
    <div className="bg-surface dark:bg-surface-dark-dim rounded-2xl border border-border dark:border-border-dark overflow-hidden">
      {/* Day header */}
      <div className={`px-5 py-4 border-b border-border/30 dark:border-border-dark/30 ${dayStyle.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-text dark:text-text-dark capitalize">
              {format(date, 'EEEE d', { locale: fr })}
            </p>
            <p className="text-sm text-text-muted dark:text-text-dark-muted capitalize">
              {format(date, 'MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors text-xs"
          >
            &times;
          </button>
        </div>

        {/* Day type badges */}
        <div className="flex items-center gap-2 mt-2">
          {dayType !== 'normal' && dayType !== 'weekend' && (
            <span className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
              ${dayType === 'school' ? 'bg-accent/15 text-accent' : ''}
              ${dayType === 'entreprise' ? 'bg-warning/15 text-warning' : ''}
              ${dayType === 'holiday' ? 'bg-danger/15 text-danger' : ''}
            `}>
              {dayType === 'school' && <GraduationCap className="w-3 h-3" />}
              {dayType === 'entreprise' && <Building2 className="w-3 h-3" />}
              {dayType === 'holiday' && <CalendarOff className="w-3 h-3" />}
              {dayStyle.label}
            </span>
          )}
          {remote && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary">
              <Laptop className="w-3 h-3" />
              Télétravail
            </span>
          )}
        </div>
      </div>

      {/* Events list */}
      <div className="p-4">
        {events.length === 0 ? (
          <p className="text-sm text-text-muted dark:text-text-dark-muted text-center py-4">
            {dayType === 'entreprise' ? 'Journée entreprise — pas d\'événements école' : 'Aucun événement'}
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} description={descriptions.get(ev.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Event Card ──

function EventCard({ event, description }: { event: MergedEvent; description?: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface-dim/50 dark:bg-surface-dark/30 border border-border/30 dark:border-border-dark/30">
      {/* Title + registration badge */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text dark:text-text-dark">
            {event.title}
          </p>
          {event.module && (
            <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
              {event.module}
              {event.moduleCode && (
                <span className="text-text-muted/50 dark:text-text-dark-muted/50 ml-1">
                  ({event.moduleCode})
                </span>
              )}
            </p>
          )}
        </div>
        {event.isRegistered && (
          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-semibold">
            <Check className="w-3 h-3" />
            Inscrit
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="mt-2 text-xs text-text-muted dark:text-text-dark-muted leading-relaxed">
          {description}
        </p>
      )}

      {/* Details */}
      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-text-muted dark:text-text-dark-muted">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {event.registeredSlot ? (
            <span>
              <span className="text-text-muted/50 dark:text-text-dark-muted/50 line-through mr-1.5">
                {formatTimeRange(event.start.toISOString(), event.end.toISOString())}
              </span>
              {formatTimeRange(event.registeredSlot.start, event.registeredSlot.end)}
            </span>
          ) : (
            <span>{formatTimeRange(event.start.toISOString(), event.end.toISOString())}</span>
          )}
        </div>
        {event.room && (
          <div className="flex items-center gap-2 text-xs text-text-muted dark:text-text-dark-muted">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{event.room}{event.city ? ` — ${event.city}` : ''}</span>
          </div>
        )}
        {event.registrationType && (
          <div className="flex items-center gap-2 text-xs text-text-muted dark:text-text-dark-muted">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="capitalize">{event.registrationType === 'group' ? 'Inscription groupe' : 'Inscription individuelle'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar: Empty ──

function SidebarEmpty() {
  return (
    <div className="bg-surface dark:bg-surface-dark-dim rounded-2xl border border-border dark:border-border-dark p-6 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-dim dark:bg-surface-dark flex items-center justify-center mb-3">
        <Clock className="w-6 h-6 text-text-muted/20 dark:text-text-dark-muted/20" />
      </div>
      <p className="text-sm font-medium text-text dark:text-text-dark">
        Sélectionnez un jour
      </p>
      <p className="text-xs text-text-muted dark:text-text-dark-muted mt-1">
        Les événements Panoramix et les infos du planning s'afficheront ici
      </p>
    </div>
  );
}

// ── Legend ──

function Legend() {
  const items = [
    { icon: GraduationCap, label: 'Jour école', colorClass: 'text-accent bg-accent/10' },
    { icon: Building2, label: 'Jour entreprise', colorClass: 'text-warning bg-warning/10' },
    { icon: CalendarOff, label: 'Jour férié', colorClass: 'text-danger bg-danger/10' },
    { icon: Laptop, label: 'Télétravail', colorClass: 'text-primary bg-primary/10' },
    { icon: Check, label: 'Événement inscrit', colorClass: 'text-success bg-success/10' },
  ];

  return (
    <div className="bg-surface dark:bg-surface-dark-dim rounded-2xl border border-border dark:border-border-dark p-4">
      <p className="text-[10px] font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider mb-3">
        Légende
      </p>
      <div className="space-y-2">
        {items.map(({ icon: Icon, label, colorClass }) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs text-text-muted dark:text-text-dark-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
