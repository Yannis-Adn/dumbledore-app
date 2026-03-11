import type { PanoramixEvent, PanoramixEventDetail } from '@/lib/panoramix-api';
import type { PROJECT_COLORS } from '@/components/GanttChart';

export type View = 'day' | 'week' | 'month';

export interface Props {
  panoramixEvents: PanoramixEvent[];
  courseColorMap: Map<number, typeof PROJECT_COLORS[0]>;
  eventDetailsMap: Map<string, PanoramixEventDetail>;
  showPlanning?: boolean;
}
