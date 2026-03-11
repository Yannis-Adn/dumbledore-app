import planningData from '@/data/planning-msc1-2026.json';

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

const data = planningData as PlanningData;

// Build a fast lookup map: "2026-03-04" -> PlanningDay
const dayMap = new Map<string, PlanningDay>();
for (const month of data.months) {
  for (const day of month.days) {
    dayMap.set(day.date, day);
  }
}

export function getPlanningDay(dateStr: string): PlanningDay | undefined {
  return dayMap.get(dateStr);
}

export type DayType = 'school' | 'entreprise' | 'holiday' | 'weekend' | 'normal';

export function getDayType(dateStr: string): DayType {
  const day = dayMap.get(dateStr);
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

  for (const month of data.months) {
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
  return dayMap.get(dateStr)?.tt ?? false;
}

/** Only MSc Pro 1 has a known alternance planning for now */
export function hasPlanningData(curriculum: string | null): boolean {
  return curriculum === 'MSc Pro 1';
}
