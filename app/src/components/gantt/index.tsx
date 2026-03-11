import { useEffect, useRef, useMemo, useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CalendarEvent } from '@/lib/gandalf-api';
import { getDayType, isRemoteDay } from '@/lib/planning';
import { getGandalfCourseId } from '@/lib/panoramix-utils';
import {
  format,
  fromUnixTime,
  parseISO,
  startOfDay,
  endOfMonth,
  addDays,
  addMonths,
  differenceInCalendarDays,
  getDate,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DAY_W,
  LABEL_W,
  GRID_PAD_L,
  ROW_H,
  BAR_Y,
  BAR_H,
  HEADER_MONTHS_H,
  HEADER_DATES_LANE_H,
  HEADER_TOTAL_H,
  PROJECT_COLORS,
} from './constants';
import type { Props, TooltipState, HeaderMarker, TwoLaneHeader, EntrepriseRange } from './types';
import GanttHeader from './GanttHeader';
import GanttRow from './GanttRow';

export default function GanttChart({ events, panoramixEvents = [], showPlanning = true }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollStart: 0, moved: false });

  // Responsive label width: cap at 240px on small screens, full 340px on wider ones
  const [labelW, setLabelW] = useState(() =>
    typeof window !== 'undefined' ? Math.min(LABEL_W, Math.max(220, Math.floor(window.innerWidth * 0.58))) : LABEL_W,
  );
  useEffect(() => {
    const update = () => setLabelW(Math.min(LABEL_W, Math.max(220, Math.floor(window.innerWidth * 0.58))));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Floating tooltip (rendered via portal to escape overflow containers)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showTooltip = useCallback((e: React.MouseEvent, content: ReactNode, anchor: 'top' | 'bottom' = 'top') => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      content,
      x: rect.left + rect.width / 2,
      y: anchor === 'top' ? rect.top : rect.bottom,
      anchor,
    });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  // Filter out retrospective Panoramix events (check title + activityRef name, handle accent)
  const filteredPanoramixEvents = useMemo(
    () =>
      panoramixEvents.filter((pe) => {
        const t = pe.title || '';
        const a = pe.moduleRef?.activityRef?.name || '';
        const re = /r[eé]trospective/i;
        return !re.test(t) && !re.test(a);
      }),
    [panoramixEvents],
  );

  // Group events by course (also filter retrospective Gandalf events)
  const courseGroups = useMemo(() => {
    const filtered = events.filter(
      (e) =>
        e.modulename !== 'feedback' &&
        e.modulename !== 'groupselect' &&
        !/r[eé]trospective/i.test(e.activityname || e.name),
    );

    const groups = new Map<number, CalendarEvent[]>();
    for (const ev of filtered) {
      const cid = ev.course?.id;
      if (cid == null) continue;
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid)!.push(ev);
    }

    for (const evs of groups.values()) {
      evs.sort((a, b) => a.timesort - b.timesort);
    }

    const nowTs = Math.floor(Date.now() / 1000);
    return [...groups.values()]
      .sort((a, b) => {
        const nextA = a.find((e) => e.timesort > nowTs)?.timesort ?? a[a.length - 1].timesort;
        const nextB = b.find((e) => e.timesort > nowTs)?.timesort ?? b[b.length - 1].timesort;
        return nextA - nextB;
      })
      .slice(0, 8);
  }, [events]);

  const { rangeStart, days, todayIdx } = useMemo(() => {
    const today = startOfDay(new Date());
    const end = endOfMonth(addMonths(today, 4));
    const total = differenceInCalendarDays(end, today) + 1;
    const dayArr = Array.from({ length: total }, (_, i) => addDays(today, i));
    return { rangeStart: today, days: dayArr, todayIdx: 0 };
  }, [courseGroups]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = 0;
  }, [days]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!scrollRef.current) return;
    if ((e.target as HTMLElement).closest('a')) return;
    dragRef.current = { active: true, startX: e.clientX, scrollStart: scrollRef.current.scrollLeft, moved: false };
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.setPointerCapture(e.pointerId);
    setTooltip(null);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active || !scrollRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 3) dragRef.current.moved = true;
    scrollRef.current.scrollLeft = dragRef.current.scrollStart - dx;
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  }, []);

  // Month boundaries for header labels and vertical lines
  const monthBoundaries = useMemo(() => {
    const bounds: { idx: number; label: string }[] = [];
    for (let i = 0; i < days.length; i++) {
      if (i === 0 || days[i].getMonth() !== days[i - 1].getMonth()) {
        bounds.push({ idx: i, label: format(days[i], 'MMMM', { locale: fr }) });
      }
    }
    return bounds;
  }, [days]);

  // Filter month labels that overlap with today badge
  const safeMonthBoundaries = monthBoundaries.filter((mb) => Math.abs(mb.idx - todayIdx) > 4);

  // Compute entreprise day ranges for bar overlays
  const entrepriseRanges = useMemo((): EntrepriseRange[] => {
    if (!showPlanning) return [];
    const ranges: EntrepriseRange[] = [];
    let blockStart: number | null = null;
    let lastEntIdx: number | null = null;

    for (let i = 0; i < days.length; i++) {
      const dateStr = format(days[i], 'yyyy-MM-dd');
      const dayType = getDayType(dateStr);
      const isWeekend = days[i].getDay() === 0 || days[i].getDay() === 6;
      const isFerie = dayType === 'holiday';

      if (dayType === 'entreprise') {
        if (blockStart === null) blockStart = i;
        lastEntIdx = i;
      } else if ((isWeekend || isFerie) && blockStart !== null) {
        // Weekend or holiday after enterprise — keep the range open (visually grayed)
      } else {
        if (blockStart !== null && lastEntIdx !== null) {
          ranges.push({ startIdx: blockStart, width: i - 1 - blockStart + 1, entEndIdx: lastEntIdx });
          blockStart = null;
          lastEntIdx = null;
        }
      }
    }
    if (blockStart !== null && lastEntIdx !== null) {
      let visualEnd = lastEntIdx;
      for (let j = lastEntIdx + 1; j < days.length; j++) {
        const jWe = days[j].getDay() === 0 || days[j].getDay() === 6;
        const jFe = getDayType(format(days[j], 'yyyy-MM-dd')) === 'holiday';
        if (jWe || jFe) visualEnd = j;
        else break;
      }
      ranges.push({ startIdx: blockStart, width: visualEnd - blockStart + 1, entEndIdx: lastEntIdx });
    }
    return ranges;
  }, [days, showPlanning]);

  // TT (remote work) day indices — used for red dot markers on bars
  const ttDayIndices = useMemo(() => {
    if (!showPlanning) return [];
    const indices: number[] = [];
    for (let i = 0; i < days.length; i++) {
      if (isRemoteDay(format(days[i], 'yyyy-MM-dd'))) indices.push(i);
    }
    return indices;
  }, [days, showPlanning]);

  // Collect all event day markers for the header (Gandalf + Panoramix) with row index
  const headerMarkers = useMemo((): HeaderMarker[] => {
    const markers: HeaderMarker[] = [];
    courseGroups.forEach((group, idx) => {
      const c = PROJECT_COLORS[idx % PROJECT_COLORS.length];
      const isOverdue = group[group.length - 1].overdue;
      const bg = isOverdue ? '#CD7B72' : c.bg;
      for (const ev of group) {
        const evDate = fromUnixTime(ev.timesort);
        const di = differenceInCalendarDays(startOfDay(evDate), rangeStart);
        if (di >= 0 && di < days.length) {
          markers.push({
            dayIdx: di,
            day: getDate(evDate),
            month: format(evDate, 'MMM', { locale: fr }),
            color: bg,
            rowIdx: idx,
            isAssign: ev.modulename === 'assign',
          });
        }
      }
      // Panoramix event date markers
      const courseId = group[0].course?.id;
      if (courseId) {
        filteredPanoramixEvents
          .filter((pe) => getGandalfCourseId(pe) === courseId)
          .forEach((pe) => {
            const slot = pe.isRegistered && typeof pe.isRegistered === 'object' ? pe.isRegistered : null;
            const d = slot ? parseISO(slot.start) : parseISO(pe.start);
            const di = differenceInCalendarDays(startOfDay(d), rangeStart);
            if (di >= 0 && di < days.length) {
              markers.push({
                dayIdx: di,
                day: getDate(d),
                month: format(d, 'MMM', { locale: fr }),
                color: bg,
                rowIdx: idx,
                isAssign: false,
              });
            }
          });
      }
    });
    return markers.filter((m) => Math.abs(m.dayIdx - todayIdx) > 2);
  }, [courseGroups, filteredPanoramixEvents, rangeStart, days, todayIdx]);

  // 3-lane bottom header: combine event + entreprise markers, greedily assign to lane 0/1/2.
  const twoLaneHeaders = useMemo((): TwoLaneHeader[] => {
    const MIN_GAP = 4;
    const LANES = 3;

    const all: Omit<TwoLaneHeader, 'lane'>[] = [
      ...headerMarkers.map((m, i) => ({
        key: `evt-${m.dayIdx}-${i}`,
        dayIdx: m.dayIdx,
        label: `${m.day} ${m.month}`,
        color: m.color,
        fontSize: '10px',
        fontWeight: '700',
      })),
    ]
      .filter((m) => Math.abs(m.dayIdx - todayIdx) > 2)
      .sort((a, b) => a.dayIdx - b.dayIdx);

    const laneLastDay: number[] = Array(LANES).fill(-Infinity);
    const result: TwoLaneHeader[] = [];
    for (const m of all) {
      const freeLane = laneLastDay.findIndex((last) => m.dayIdx - last >= MIN_GAP);
      if (freeLane === -1) continue;
      laneLastDay[freeLane] = m.dayIdx;
      result.push({ ...m, lane: freeLane });
    }
    return result;
  }, [headerMarkers, todayIdx]);

  if (!courseGroups.length) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-text-muted dark:text-text-dark-muted">
        Aucun événement à afficher
      </div>
    );
  }

  const gridW = days.length * DAY_W;

  return (
    <>
      <div
        ref={scrollRef}
        className="overflow-x-auto gantt-scroll cursor-grab"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div style={{ width: labelW + GRID_PAD_L + gridW }} className="relative select-none">
          {/* Two-row header */}
          <GanttHeader
            labelW={labelW}
            days={days}
            todayIdx={todayIdx}
            safeMonthBoundaries={safeMonthBoundaries}
            twoLaneHeaders={twoLaneHeaders}
          />

          <div className="h-px bg-border/40 dark:bg-border-dark/40" />

          {/* Rows (one per course) */}
          {courseGroups.map((group, idx) => (
            <GanttRow
              key={group[0].course?.id ?? idx}
              group={group}
              idx={idx}
              labelW={labelW}
              rangeStart={rangeStart}
              days={days}
              filteredPanoramixEvents={filteredPanoramixEvents}
              entrepriseRanges={entrepriseRanges}
              ttDayIndices={ttDayIndices}
              showTooltip={showTooltip}
              hideTooltip={hideTooltip}
            />
          ))}

          {/* Connecting lines (Rendu + today only) */}
          {twoLaneHeaders.map((m) => {
            const hm = headerMarkers.find((h) => h.dayIdx === m.dayIdx && h.color === m.color && h.isAssign);
            if (!hm) return null;
            const lineX = labelW + GRID_PAD_L + m.dayIdx * DAY_W + DAY_W / 2;
            const lineTop = HEADER_MONTHS_H + HEADER_DATES_LANE_H * m.lane + HEADER_DATES_LANE_H;
            const lineBottom = HEADER_TOTAL_H + 1 + hm.rowIdx * ROW_H + BAR_Y + BAR_H / 2;
            if (lineBottom <= lineTop) return null;
            return (
              <div
                key={`conn-${m.key}`}
                className="absolute pointer-events-none z-[1]"
                style={{
                  left: lineX,
                  top: lineTop,
                  width: 1,
                  height: lineBottom - lineTop,
                  backgroundColor: m.color,
                  opacity: 0.2,
                }}
              />
            );
          })}

          {/* Today vertical line (from badge down to bottom) */}
          {todayIdx >= 0 && todayIdx < days.length && (
            <div
              className="absolute bottom-0 z-[3] pointer-events-none"
              style={{ left: labelW + GRID_PAD_L + todayIdx * DAY_W + DAY_W / 2, top: HEADER_MONTHS_H / 2 + 12 }}
            >
              <div className="w-0.5 h-full bg-accent/40" />
            </div>
          )}
        </div>
      </div>

      {/* Floating tooltip portal — renders outside overflow containers */}
      {tooltip &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.anchor === 'bottom' ? tooltip.y + 6 : tooltip.y - 6,
              transform: tooltip.anchor === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            <div className="bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60 rounded-lg shadow-lg px-3 py-2 whitespace-nowrap text-left">
              {tooltip.content}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
