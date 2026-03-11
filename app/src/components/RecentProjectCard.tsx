import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronDown } from 'lucide-react';
import type { Course, GradingResult } from '@/lib/gandalf-api';

interface Props {
  course: Course;
  isActive?: boolean;
  gradingResults?: GradingResult[];
}

export default function RecentProjectCard({ course, isActive, gradingResults }: Props) {
  const [expanded, setExpanded] = useState(false);
  const projectCode = course.shortname.split('_')[0];
  const displayName = course.fullname.replace(/^T-\w+-\d+\s*-\s*/, '');
  const isGraded = !!gradingResults;

  // Compute grade summary from all grading results
  const gradeSummary = gradingResults ? (() => {
    let totalCriteria = 0;
    let successCriteria = 0;
    for (const g of gradingResults) {
      totalCriteria += g.count_achievements;
      successCriteria += g.count_achievements_success;
    }
    const score = totalCriteria > 0 ? Math.round((successCriteria / totalCriteria) * 100) : 0;
    return { score, successCriteria, totalCriteria };
  })() : null;

  return (
    <div>
      <div className="group flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-surface-dim/60 dark:hover:bg-surface-dark/40">
        <Link to={`/project/${course.id}`} className="shrink-0">
          <img
            src={course.courseimage}
            alt=""
            className="w-9 h-9 rounded-lg object-cover bg-primary/10"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/project/${course.id}`}>
            <p className="text-sm font-medium text-text dark:text-text-dark truncate group-hover:text-primary transition-colors">
              {displayName}
            </p>
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] font-mono text-text-muted dark:text-text-dark-muted">
              {projectCode}
            </p>
            {isActive && (
              <span
                title="Projet en cours"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/15 text-success dark:bg-success/10 dark:text-success text-[10px] font-medium cursor-default"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_rgba(139,191,159,0.6)]" />
                En cours
              </span>
            )}
            {isGraded && (
              <span
                title="Ce projet a été noté"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-600/15 text-amber-700 dark:bg-warning/10 dark:text-warning text-[10px] font-medium cursor-default"
              >
                <Trophy className="w-2.5 h-2.5" />
                Noté
              </span>
            )}
          </div>
        </div>
        {isGraded && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 p-1 rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-all"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Expandable grade details */}
      {expanded && gradeSummary && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-surface-dim/40 dark:bg-surface-dark/30 border border-border/20 dark:border-border-dark/20 animate-[modal-in_0.15s_ease-out]">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-text-muted dark:text-text-dark-muted">Note</span>
            <span className="text-sm font-bold text-text dark:text-text-dark tabular-nums">
              {gradeSummary.score}<span className="text-[11px] font-normal text-text-muted dark:text-text-dark-muted">/100</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[11px] text-text-muted dark:text-text-dark-muted">Critères</span>
            <span className="text-xs font-medium text-text dark:text-text-dark tabular-nums">
              {gradeSummary.successCriteria}<span className="text-[11px] font-normal text-text-muted dark:text-text-dark-muted">/{gradeSummary.totalCriteria}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
