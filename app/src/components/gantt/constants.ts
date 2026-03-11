export const DAY_W = 20;
export const LABEL_W = 340;
export const GRID_PAD_L = 48;
export const ROW_H = 52;
export const BAR_H = 34;
export const BAR_Y = (ROW_H - BAR_H) / 2;
export const HEADER_MONTHS_H = 32;
export const HEADER_DATES_H = 60; // 3 lanes × 20px
export const HEADER_DATES_LANE_H = 20; // 20px per lane
export const HEADER_TOTAL_H = HEADER_MONTHS_H + HEADER_DATES_H;
export const MILESTONE_SIZE_LG = 24;

export const PROJECT_COLORS = [
  { gradient: 'linear-gradient(90deg, #B5C9A8, #8AAF78)', bg: '#8AAF78', glow: '0 4px 14px -2px rgba(138,175,120,0.3)' },
  { gradient: 'linear-gradient(90deg, #C4B5D8, #A68EC4)', bg: '#A68EC4', glow: '0 4px 14px -2px rgba(166,142,196,0.3)' },
  { gradient: 'linear-gradient(90deg, #E8C9A0, #D4A96E)', bg: '#D4A96E', glow: '0 4px 14px -2px rgba(212,169,110,0.3)' },
  { gradient: 'linear-gradient(90deg, #A8CCC8, #7BB5AF)', bg: '#7BB5AF', glow: '0 4px 14px -2px rgba(123,181,175,0.3)' },
  { gradient: 'linear-gradient(90deg, #D8B5C4, #C48EA3)', bg: '#C48EA3', glow: '0 4px 14px -2px rgba(196,142,163,0.3)' },
];

export const OVERDUE_COLOR = {
  gradient: 'linear-gradient(90deg, #E0A8A0, #CD7B72)',
  glow: '0 4px 14px -2px rgba(205,123,114,0.35)',
};

export const ENTREPRISE_COLOR = '#8B95A5';

export function formatRemaining(timesortUnix: number): { label: string; className: string } {
  const diff = timesortUnix - Math.floor(Date.now() / 1000);

  if (diff < 0) {
    const d = Math.floor(Math.abs(diff) / 86400);
    return { label: d > 0 ? `-${d}j en retard` : `-${Math.floor(Math.abs(diff) / 3600)}h`, className: 'text-danger' };
  }

  const d = Math.floor(diff / 86400);

  if (d === 0) {
    const h = Math.floor(diff / 3600);
    return { label: h > 0 ? `${h}h restantes` : `${Math.floor(diff / 60)}min`, className: 'text-danger' };
  }
  if (d <= 15) return { label: `${d}j restants`, className: 'text-danger' };
  return { label: `${d}j restants`, className: 'text-text-muted dark:text-text-dark-muted' };
}
