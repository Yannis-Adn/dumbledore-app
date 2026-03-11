import type { CalendarEvent } from '@/lib/gandalf-api';
import type { PanoramixEvent } from '@/lib/panoramix-api';
import type { ReactNode } from 'react';

export interface Props {
  events: CalendarEvent[];
  panoramixEvents?: PanoramixEvent[];
  showPlanning?: boolean;
}

export interface TooltipState {
  content: ReactNode;
  x: number;
  y: number;
  anchor: 'top' | 'bottom';
}

export interface HeaderMarker {
  dayIdx: number;
  day: number;
  month: string;
  color: string;
  rowIdx: number;
  isAssign: boolean;
}

export interface TwoLaneHeader {
  key: string;
  dayIdx: number;
  label: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  lane: number;
}

export interface EntrepriseRange {
  startIdx: number;
  width: number;
  entEndIdx: number;
}
