import type { ReactNode } from 'react';
import type { CalendarEvent } from '@/lib/gandalf-api';
import type { PanoramixEvent } from '@/lib/panoramix-api';
import { getGandalfCourseId } from '@/lib/panoramix-utils';
import { format, fromUnixTime, parseISO, startOfDay, addDays, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Flag, AlertTriangle, Building2 } from 'lucide-react';
import {
  DAY_W,
  GRID_PAD_L,
  ROW_H,
  BAR_H,
  BAR_Y,
  MILESTONE_SIZE_LG,
  PROJECT_COLORS,
  OVERDUE_COLOR,
  ENTREPRISE_COLOR,
  formatRemaining,
} from './constants';
import type { EntrepriseRange } from './types';

interface GanttRowProps {
  group: CalendarEvent[];
  idx: number;
  labelW: number;
  rangeStart: Date;
  days: Date[];
  filteredPanoramixEvents: PanoramixEvent[];
  entrepriseRanges: EntrepriseRange[];
  ttDayIndices: number[];
  showTooltip: (e: React.MouseEvent, content: ReactNode, anchor?: 'top' | 'bottom') => void;
  hideTooltip: () => void;
}

export default function GanttRow({
  group,
  idx,
  labelW,
  rangeStart,
  days,
  filteredPanoramixEvents,
  entrepriseRanges,
  ttDayIndices,
  showTooltip,
  hideTooltip,
}: GanttRowProps) {
  const firstEv = group[0];
  const latestEv = group[group.length - 1];
  const color = PROJECT_COLORS[idx % PROJECT_COLORS.length];
  const code = firstEv.course?.shortname?.split('_')[0] ?? '';
  const letter = String.fromCharCode(65 + (idx % 26));
  const displayName = firstEv.course?.fullname?.replace(/^T-\w+-\d+\s*-\s*/, '') ?? firstEv.name;
  const courseUrl =
    firstEv.course?.viewurl ||
    (firstEv.course?.id ? `https://gandalf.epitech.eu/course/view.php?id=${firstEv.course.id}` : '');

  const isOverdue = latestEv.overdue;
  const nextDeadline = group.find((e) => e.timesort > Math.floor(Date.now() / 1000)) ?? latestEv;
  const remaining = formatRemaining(nextDeadline.timesort);

  // Bar range: today→latest deadline (if active project), else earliest→latest
  const hasProject = group.some((e) => e.modulename === 'assign');
  const barStartDate = hasProject && !isOverdue ? startOfDay(new Date()) : startOfDay(fromUnixTime(firstEv.timestart));
  const barEndDate = startOfDay(fromUnixTime(latestEv.timesort));

  const bStart = Math.max(differenceInCalendarDays(barStartDate, rangeStart), 0);
  const bEnd = differenceInCalendarDays(barEndDate, rangeStart);
  const bLeft = bStart * DAY_W;
  const bWidth = Math.max((bEnd - bStart) * DAY_W, DAY_W * 4);

  // Pre-sort Panoramix pills for this course and assign vertical lanes to avoid overlaps.
  const PILL_H = 20;
  const pillYBase = BAR_Y + (BAR_H - PILL_H) / 2;
  const PILL_MIN_GAP = 5;
  const pillTrackLast: [number, number] = [-Infinity, -Infinity];
  const pillLaneById = new Map<string, 0 | 1>();
  const coursePills = filteredPanoramixEvents
    .filter((pe) => getGandalfCourseId(pe) === firstEv.course?.id)
    .map((pe) => {
      const rSlot = pe.isRegistered && typeof pe.isRegistered === 'object' ? pe.isRegistered : null;
      const slotDate = rSlot ? parseISO(rSlot.start) : parseISO(pe.start);
      const peDay = differenceInCalendarDays(startOfDay(slotDate), rangeStart);
      return { pe, peDay };
    })
    .filter(({ peDay }) => peDay >= 0 && peDay < days.length)
    .sort((a, b) => a.peDay - b.peDay);

  for (const { pe, peDay } of coursePills) {
    const f0 = peDay - pillTrackLast[0] >= PILL_MIN_GAP;
    const f1 = peDay - pillTrackLast[1] >= PILL_MIN_GAP;
    let lane: 0 | 1;
    if (f0) {
      lane = 0;
    } else if (f1) {
      lane = 1;
    } else {
      lane = pillTrackLast[0] <= pillTrackLast[1] ? 0 : 1;
    }
    pillTrackLast[lane] = peDay;
    pillLaneById.set(pe._id, lane);
  }

  return (
    <div
      key={firstEv.course?.id ?? idx}
      className="flex hover:bg-surface-dim/40 dark:hover:bg-surface-dark/20 transition-colors"
      style={{ height: ROW_H }}
    >
      {/* Sticky label */}
      <div
        className="shrink-0 sticky left-0 z-20 flex items-center gap-3 px-4 pr-6 bg-surface dark:bg-surface-dark-dim border-r border-border/30 dark:border-border-dark/30 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.2)]"
        style={{ width: labelW }}
      >
        <span
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-white"
          style={{
            backgroundColor: isOverdue ? '#CD7B72' : color.bg,
            boxShadow: `0 2px 8px -1px ${isOverdue ? 'rgba(205,123,114,0.3)' : color.bg + '40'}`,
          }}
        >
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text dark:text-text-dark truncate leading-tight">
            {displayName}
          </p>
          <p className="text-[11px] text-text-muted dark:text-text-dark-muted truncate leading-tight mt-0.5">
            {code}
          </p>
        </div>
        <span className={`shrink-0 text-[11px] font-medium ${remaining.className}`}>{remaining.label}</span>
      </div>

      {/* Bar area */}
      <div className="relative flex-1">
        {/* Bar with enterprise overlay inside */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            top: BAR_Y,
            left: GRID_PAD_L + bLeft,
            width: bWidth,
            height: BAR_H,
            background: isOverdue ? OVERDUE_COLOR.gradient : color.gradient,
            boxShadow: isOverdue ? OVERDUE_COLOR.glow : color.glow,
          }}
        >
          {/* Enterprise day overlays — always on top of bar color */}
          {entrepriseRanges.map((range, ri) => {
            const relLeft = range.startIdx * DAY_W - bLeft;
            const relWidth = range.width * DAY_W;
            return (
              <div
                key={`ent-bar-${ri}`}
                className="absolute top-0 bottom-0"
                style={{ left: relLeft, width: relWidth, backgroundColor: 'rgba(80,80,80,0.5)' }}
              />
            );
          })}
          {/* Enterprise icons centered in visible portion of each range */}
          {entrepriseRanges.map((range, ri) => {
            const relLeft = range.startIdx * DAY_W - bLeft;
            const relRight = relLeft + range.width * DAY_W;
            const visLeft = Math.max(0, relLeft);
            const visRight = Math.min(bWidth, relRight);
            const visWidth = visRight - visLeft;
            if (visWidth < 36) return null;
            const iconCenter = visLeft + visWidth / 2;
            return (
              <div
                key={`ent-icon-${ri}`}
                className="absolute pointer-events-none flex items-center justify-center"
                style={{ left: iconCenter - 7, top: (BAR_H - 14) / 2, width: 14, height: 14 }}
              >
                <Building2 className="w-3.5 h-3.5 text-white/50" />
              </div>
            );
          })}
        </div>

        {/* Enterprise hover zones (styled tooltip, outside overflow-hidden bar) */}
        {entrepriseRanges.map((range, ri) => {
          const zoneLeft = Math.max(GRID_PAD_L + range.startIdx * DAY_W, GRID_PAD_L + bLeft);
          const zoneRight = Math.min(
            GRID_PAD_L + (range.startIdx + range.width) * DAY_W,
            GRID_PAD_L + bLeft + bWidth,
          );
          const zoneWidth = zoneRight - zoneLeft;
          if (zoneWidth <= 0) return null;
          return (
            <div
              key={`ent-hover-${ri}`}
              className="absolute z-[40] cursor-default"
              style={{ top: BAR_Y, left: zoneLeft, width: zoneWidth, height: BAR_H, borderRadius: BAR_H / 2 }}
              onMouseEnter={(e) =>
                showTooltip(
                  e,
                  <>
                    <p className="text-[10px] font-bold flex items-center justify-center gap-1" style={{ color: ENTREPRISE_COLOR }}>
                      <Building2 className="w-3 h-3" />
                      En entreprise
                    </p>
                    <p className="text-[9px] text-text-muted dark:text-text-dark-muted capitalize mt-0.5">
                      Du {format(days[range.startIdx], 'EEE d MMMM', { locale: fr })} au{' '}
                      {format(days[range.entEndIdx], 'EEE d MMMM', { locale: fr })}
                    </p>
                  </>,
                  'top',
                )
              }
              onMouseLeave={hideTooltip}
            />
          );
        })}

        {/* Milestone markers (Rendu only) */}
        {group
          .filter((m) => m.modulename === 'assign')
          .map((milestone) => {
            const milestoneDate = fromUnixTime(milestone.timesort);
            const mDay = differenceInCalendarDays(startOfDay(milestoneDate), rangeStart);
            if (mDay < 0 || mDay >= days.length) return null;
            const size = MILESTONE_SIZE_LG;
            const mLeft = GRID_PAD_L + mDay * DAY_W + DAY_W / 2 - size / 2;
            const bgColor = isOverdue ? '#CD7B72' : color.bg;

            return (
              <a
                key={milestone.id}
                href={courseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute z-10 hover:z-[35]"
                style={{
                  top: BAR_Y + (BAR_H - size) / 2,
                  left: mLeft,
                  width: size,
                  height: size,
                }}
                onMouseEnter={(e) =>
                  showTooltip(
                    e,
                    <>
                      <p className="text-[11px] font-semibold text-text dark:text-text-dark">Rendu</p>
                      <p className="text-[10px] text-text-muted dark:text-text-dark-muted mt-0.5">
                        {format(milestoneDate, 'EEE d MMM', { locale: fr })} · {format(milestoneDate, 'HH:mm')}
                      </p>
                      <p className="text-[10px] text-text-muted dark:text-text-dark-muted">
                        {displayName} · {code}
                      </p>
                      <p className={`text-[10px] mt-0.5 font-medium ${formatRemaining(milestone.timesort).className}`}>
                        {milestone.overdue ? '⚠ En retard' : formatRemaining(milestone.timesort).label}
                      </p>
                    </>,
                    'top',
                  )
                }
                onMouseLeave={hideTooltip}
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform ring-2 ring-surface dark:ring-surface-dark-dim"
                  style={{ backgroundColor: bgColor }}
                >
                  <Flag className="w-3 h-3" />
                </div>
              </a>
            );
          })}

        {/* Panoramix event markers (pills with tooltip, 2-lane vertical stagger) */}
        {coursePills.map(({ pe, peDay }) => {
          const peDate = parseISO(pe.start);
          const registered = !!pe.isRegistered;
          const registeredSlot = pe.isRegistered && typeof pe.isRegistered === 'object' ? pe.isRegistered : null;
          const slotDate = registeredSlot ? parseISO(registeredSlot.start) : peDate;
          const pxBg = isOverdue ? '#CD7B72' : color.bg;
          const slotTime = registeredSlot
            ? `${format(parseISO(registeredSlot.start), 'HH:mm')} – ${format(parseISO(registeredSlot.end), 'HH:mm')}`
            : `${format(peDate, 'HH:mm')} – ${format(parseISO(pe.end), 'HH:mm')}`;
          const room = pe.roomsRef?.[0]?.name;
          const activity = pe.moduleRef?.activityRef?.name ?? pe.title;
          const shortName = activity.length > 12 ? activity.slice(0, 10) + '…' : activity;
          const dateLabel = format(slotDate, 'EEE d MMM', { locale: fr });
          const pxLeft = GRID_PAD_L + peDay * DAY_W + DAY_W / 2;
          const dow = slotDate.getDay();
          const mondayOffset = dow === 0 ? -6 : 1 - dow;
          const weekStart = startOfDay(addDays(slotDate, mondayOffset));
          const weekEnd = addDays(weekStart, 7);
          const panoramixUrl = `https://panoramix.epitest.eu/calendar/events/${pe._id}/details?view=timeGridWeek&start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}&visible=true`;
          const pillLane = pillLaneById.get(pe._id) ?? 0;
          const pillTop = pillYBase + pillLane * (PILL_H + 2);

          return (
            <a
              key={pe._id}
              href={panoramixUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute z-[8] cursor-pointer hover:z-[35]"
              style={{
                top: pillTop,
                left: pxLeft,
                transform: 'translateX(-50%)',
              }}
              onMouseEnter={(e) =>
                showTooltip(
                  e,
                  <>
                    <p className="text-[11px] font-semibold text-text dark:text-text-dark">{activity}</p>
                    <p className="text-[10px] text-text-muted dark:text-text-dark-muted mt-0.5">
                      {dateLabel} · {slotTime}
                    </p>
                    {room && (
                      <p className="text-[10px] text-text-muted dark:text-text-dark-muted">
                        📍 {room}
                      </p>
                    )}
                    <p className="text-[10px] mt-0.5" style={{ color: registered ? '#22c55e' : '#ef4444' }}>
                      {registered ? '✓ Inscrit' : '⚠ Non inscrit'}
                    </p>
                  </>,
                  'bottom',
                )
              }
              onMouseLeave={hideTooltip}
            >
              {/* Pill marker */}
              <div
                className="h-[20px] rounded-md flex items-center gap-1 px-1.5 whitespace-nowrap bg-surface dark:bg-surface-dark border border-border/40 dark:border-border-dark/40"
                style={{
                  borderLeft: `3px solid ${registered ? pxBg : '#ef4444'}`,
                  opacity: registered ? 1 : 0.7,
                }}
              >
                {registered ? (
                  <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 16 16" fill={pxBg}>
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                ) : (
                  <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-danger" />
                )}
                <span className="text-[9px] font-semibold leading-none text-text dark:text-text-dark">{shortName}</span>
              </div>
            </a>
          );
        })}

        {/* TT (remote work) day dots on bars */}
        {ttDayIndices.map((i) => {
          const dotX = GRID_PAD_L + i * DAY_W + DAY_W / 2;
          const barLeftPx = GRID_PAD_L + bLeft;
          const barRightPx = barLeftPx + bWidth;
          if (dotX < barLeftPx + 4 || dotX > barRightPx - 4) return null;
          return (
            <div
              key={`tt-${i}`}
              className="absolute z-[6]"
              style={{ top: BAR_Y + BAR_H - 4, left: dotX, transform: 'translateX(-50%)' }}
              onMouseEnter={(e) =>
                showTooltip(
                  e,
                  <>
                    <p className="text-[10px] font-bold text-accent">TT</p>
                    <p className="text-[9px] text-text-muted dark:text-text-dark-muted capitalize">
                      {format(days[i], 'EEEE d MMMM', { locale: fr })}
                    </p>
                  </>,
                  'top',
                )
              }
              onMouseLeave={hideTooltip}
            >
              <div
                className="w-[5px] h-[5px] rounded-full bg-accent cursor-pointer ring-1 ring-white/30 hover:scale-150 transition-transform"
                tabIndex={0}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
