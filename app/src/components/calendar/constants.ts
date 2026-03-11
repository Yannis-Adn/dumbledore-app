import type { View } from './types';

export const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const VIEW_LABELS: Record<View, string> = {
  day: "Aujourd'hui",
  week: 'Semaine',
  month: 'Mois',
};

export const TIMELINE_START_HOUR = 9;
export const TIMELINE_END_HOUR = 18;
export const HOUR_HEIGHT = 56;
export const WEEK_HOUR_HEIGHT = 48;
export const FS_HOUR_HEIGHT = 72;
export const FS_WEEK_HOUR_HEIGHT = 64;

/** Neutral color for events not linked to a project */
export const NEUTRAL_BG = '#9E9689';
