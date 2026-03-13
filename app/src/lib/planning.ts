import msc1Data from '@/data/planning-msc1-2026.json';
import preMscData from '@/data/planning-premsc-2026.json';

export interface PlanningDay {
  date: string;
  weekday: string;
  weekend: boolean;
  ferie: boolean;
  of: boolean;
  entreprise: boolean;
  tt: boolean;
  color: string;
}

interface PlanningMonth {
  month: string;
  days: PlanningDay[];
}

interface PlanningData {
  year: string;
  months: PlanningMonth[];
}

// All supported curricula and their planning datasets
const datasets: Record<string, PlanningData> = {
  'MSc Pro 1': msc1Data as PlanningData,
  'Pré-MSc Pro': preMscData as PlanningData,
};

// Pre-build lookup maps for each curriculum
const dayMaps = new Map<string, Map<string, PlanningDay>>();
for (const [curriculum, planData] of Object.entries(datasets)) {
  const map = new Map<string, PlanningDay>();
  for (const month of planData.months) {
    for (const day of month.days) {
      map.set(day.date, day);
    }
  }
  dayMaps.set(curriculum, map);
}

// Active curriculum — set once via setCurriculum(), used by all functions
let activeDayMap: Map<string, PlanningDay> = dayMaps.get('MSc Pro 1')!;
let activeData: PlanningData = datasets['MSc Pro 1'];

/** Set the active curriculum. Call once from auth context. */
export function setCurriculum(curriculum: string | null) {
  activeDayMap = (curriculum && dayMaps.get(curriculum)) || dayMaps.get('MSc Pro 1')!;
  activeData = (curriculum && datasets[curriculum]) || datasets['MSc Pro 1'];
}

export function getPlanningDay(dateStr: string): PlanningDay | undefined {
  return activeDayMap.get(dateStr);
}

export type DayType = 'school' | 'entreprise' | 'holiday' | 'weekend' | 'normal';

export function getDayType(dateStr: string): DayType {
  const day = activeDayMap.get(dateStr);
  if (!day) return 'normal';
  if (day.ferie) return 'holiday';
  if (day.weekend) return 'weekend';
  if (day.of) return 'school';
  if (day.entreprise) return 'entreprise';
  return 'normal';
}

export interface PlanningBlock {
  type: 'school' | 'entreprise';
  start: string;
  end: string;
}

/** Compute contiguous blocks of school/entreprise periods for the year timeline */
export function getPlanningBlocks(): PlanningBlock[] {
  const blocks: PlanningBlock[] = [];
  let currentType: 'school' | 'entreprise' | null = null;
  let blockStart: string | null = null;
  let lastDate: string | null = null;

  for (const month of activeData.months) {
    for (const day of month.days) {
      if (day.weekend || day.ferie) {
        // Weekends/holidays don't break a block
        continue;
      }

      const type = day.of ? 'school' : day.entreprise ? 'entreprise' : null;

      if (type && type === currentType) {
        lastDate = day.date;
      } else {
        if (currentType && blockStart && lastDate) {
          blocks.push({ type: currentType, start: blockStart, end: lastDate });
        }
        if (type) {
          currentType = type;
          blockStart = day.date;
          lastDate = day.date;
        } else {
          currentType = null;
          blockStart = null;
          lastDate = null;
        }
      }
    }
  }

  if (currentType && blockStart && lastDate) {
    blocks.push({ type: currentType, start: blockStart, end: lastDate });
  }

  return blocks;
}

export function isRemoteDay(dateStr: string): boolean {
  return activeDayMap.get(dateStr)?.tt ?? false;
}

export function hasPlanningData(curriculum: string | null): boolean {
  return curriculum != null && curriculum in datasets;
}
