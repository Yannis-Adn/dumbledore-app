import { useMemo } from 'react';
import {
  GraduationCap,
  Building2,
  CalendarOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { PanoramixEvent } from '@/lib/panoramix-api';
import type { PROJECT_COLORS } from '@/components/GanttChart';
import { getGandalfCourseId } from '@/lib/panoramix-utils';

interface CalendarLegendProps {
  panoramixEvents: PanoramixEvent[];
  courseColorMap: Map<number, typeof PROJECT_COLORS[0]>;
  isFullscreen?: boolean;
  showPlanning?: boolean;
}

export default function CalendarLegend({ panoramixEvents, courseColorMap, isFullscreen = false, showPlanning = true }: CalendarLegendProps) {
  const projectEntries = useMemo(() => {
    const seen = new Map<string, { color: string; name: string; code: string }>();
    for (const ev of panoramixEvents) {
      const courseId = getGandalfCourseId(ev);
      if (courseId !== null) {
        const pc = courseColorMap.get(courseId);
        if (pc && !seen.has(pc.bg)) {
          const code = ev.moduleRef?.code?.split('_')[0] ?? '';
          const name = ev.moduleRef?.name?.replace(/^T-\w+-\d+\s*-\s*/, '') ?? ev.title;
          seen.set(pc.bg, { color: pc.bg, name, code });
        }
      }
    }
    return [...seen.values()];
  }, [panoramixEvents, courseColorMap]);

  return (
    <div className={`hidden lg:flex flex-col gap-3 py-4 pl-4 pr-2 border-r border-border/20 dark:border-border-dark/20 shrink-0 ${isFullscreen ? 'w-[200px] gap-5 py-6 pl-6 pr-3' : 'w-[140px]'}`}>
      <p className={`font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider ${isFullscreen ? 'text-xs' : 'text-[10px]'}`}>Légende</p>

      {/* Project colors */}
      {projectEntries.length > 0 && (
        <div className={isFullscreen ? 'space-y-3' : 'space-y-2'}>
          <p className={`font-medium text-text-muted/60 dark:text-text-dark-muted/60 uppercase ${isFullscreen ? 'text-[11px]' : 'text-[9px]'}`}>Projets</p>
          {projectEntries.map((p) => (
            <div key={p.color} className={`flex items-start ${isFullscreen ? 'gap-2.5' : 'gap-1.5'}`}>
              <span className={`rounded-sm shrink-0 mt-0.5 ${isFullscreen ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} style={{ backgroundColor: p.color }} />
              <div className="min-w-0">
                <p className={`font-medium text-text dark:text-text-dark truncate leading-tight ${isFullscreen ? 'text-sm' : 'text-[10px]'}`}>{p.name}</p>
                {p.code && <p className={`text-text-muted dark:text-text-dark-muted leading-tight ${isFullscreen ? 'text-xs' : 'text-[8px]'}`}>{p.code}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status indicators */}
      <div className={isFullscreen ? 'space-y-2.5' : 'space-y-1.5'}>
        <p className={`font-medium text-text-muted/60 dark:text-text-dark-muted/60 uppercase ${isFullscreen ? 'text-[11px]' : 'text-[9px]'}`}>Statut</p>
        <div className={`flex items-center ${isFullscreen ? 'gap-2.5' : 'gap-1.5'}`}>
          <CheckCircle2 className={`text-success shrink-0 ${isFullscreen ? 'w-4 h-4' : 'w-2.5 h-2.5'}`} />
          <span className={`text-text dark:text-text-dark ${isFullscreen ? 'text-sm' : 'text-[10px]'}`}>Inscrit</span>
        </div>
        <div className={`flex items-center ${isFullscreen ? 'gap-2.5' : 'gap-1.5'}`}>
          <AlertCircle className={`text-danger shrink-0 ${isFullscreen ? 'w-4 h-4' : 'w-2.5 h-2.5'}`} />
          <span className={`text-text dark:text-text-dark ${isFullscreen ? 'text-sm' : 'text-[10px]'}`}>Non inscrit</span>
        </div>
      </div>

      {/* Day types */}
      {showPlanning && (
        <div className={isFullscreen ? 'space-y-2.5' : 'space-y-1.5'}>
          <p className={`font-medium text-text-muted/60 dark:text-text-dark-muted/60 uppercase ${isFullscreen ? 'text-[11px]' : 'text-[9px]'}`}>Jours</p>
          <div className={`flex items-center ${isFullscreen ? 'gap-2.5' : 'gap-1.5'}`}>
            <GraduationCap className={`text-primary shrink-0 ${isFullscreen ? 'w-4.5 h-4.5' : 'w-3 h-3'}`} />
            <span className={`text-text dark:text-text-dark ${isFullscreen ? 'text-sm' : 'text-[10px]'}`}>École</span>
          </div>
          <div className={`flex items-center ${isFullscreen ? 'gap-2.5' : 'gap-1.5'}`}>
            <Building2 className={`text-warning shrink-0 ${isFullscreen ? 'w-4.5 h-4.5' : 'w-3 h-3'}`} />
            <span className={`text-text dark:text-text-dark ${isFullscreen ? 'text-sm' : 'text-[10px]'}`}>Entreprise</span>
          </div>
          <div className={`flex items-center ${isFullscreen ? 'gap-2.5' : 'gap-1.5'}`}>
            <CalendarOff className={`text-danger shrink-0 ${isFullscreen ? 'w-4.5 h-4.5' : 'w-3 h-3'}`} />
            <span className={`text-text dark:text-text-dark ${isFullscreen ? 'text-sm' : 'text-[10px]'}`}>Férié</span>
          </div>
        </div>
      )}
    </div>
  );
}
