import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DAY_W,
  GRID_PAD_L,
  HEADER_MONTHS_H,
  HEADER_DATES_H,
  HEADER_DATES_LANE_H,
  HEADER_TOTAL_H,
  LABEL_W,
} from './constants';
import type { TwoLaneHeader } from './types';

interface GanttHeaderProps {
  labelW: number;
  days: Date[];
  todayIdx: number;
  safeMonthBoundaries: { idx: number; label: string }[];
  twoLaneHeaders: TwoLaneHeader[];
}

export default function GanttHeader({
  labelW,
  days,
  todayIdx,
  safeMonthBoundaries,
  twoLaneHeaders,
}: GanttHeaderProps) {
  void LABEL_W; // imported for reference parity; actual sizing uses labelW prop
  void HEADER_DATES_H; // used indirectly via HEADER_TOTAL_H

  return (
    <div className="flex sticky top-0 z-30 bg-surface/90 dark:bg-surface-dark-dim/90 backdrop-blur-sm">
      <div
        className="shrink-0 sticky left-0 z-30 bg-surface/90 dark:bg-surface-dark-dim/90 backdrop-blur-sm border-r border-border/30 dark:border-border-dark/30"
        style={{ width: labelW, height: HEADER_TOTAL_H }}
      />
      <div className="relative flex-1" style={{ height: HEADER_TOTAL_H }}>
        {/* Row 1: Month labels */}
        {safeMonthBoundaries.map((mb) => (
          <span
            key={mb.idx}
            className="absolute text-[11px] font-medium text-text-muted/70 dark:text-text-dark-muted/70 whitespace-nowrap capitalize"
            style={{ top: HEADER_MONTHS_H / 2, left: GRID_PAD_L + mb.idx * DAY_W + 4, transform: 'translateY(-50%)' }}
          >
            {mb.label}
          </span>
        ))}

        {/* Today badge in top row */}
        {todayIdx >= 0 && todayIdx < days.length && (
          <span
            className="absolute z-10"
            style={{ top: HEADER_MONTHS_H / 2, left: GRID_PAD_L + todayIdx * DAY_W + DAY_W / 2, transform: 'translate(-50%, -50%)' }}
          >
            <span className="bg-accent text-white h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm px-2 whitespace-nowrap">
              {format(days[todayIdx], 'd MMM', { locale: fr })}
            </span>
          </span>
        )}

        {/* Separator between top row and dates row */}
        <div
          className="absolute left-0 right-0 h-px bg-border/20 dark:bg-border-dark/20"
          style={{ top: HEADER_MONTHS_H }}
        />

        {/* Row 2: Date markers (3-lane auto-dedup — no more overlaps) */}
        {twoLaneHeaders.map((m) => (
          <span
            key={m.key}
            className="absolute whitespace-nowrap z-[5] px-1 rounded-sm bg-surface dark:bg-surface-dark-dim"
            style={{
              top: HEADER_MONTHS_H + HEADER_DATES_LANE_H * m.lane + HEADER_DATES_LANE_H / 2,
              left: GRID_PAD_L + m.dayIdx * DAY_W + DAY_W / 2,
              color: m.color,
              fontSize: m.fontSize,
              fontWeight: m.fontWeight,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
