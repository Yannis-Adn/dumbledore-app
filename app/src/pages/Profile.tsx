import { useEffect, useState, useMemo } from 'react';
import { format, fromUnixTime } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/context/auth';
import type { ProfileProject, ProfileGrade } from '@/lib/gandalf-api';
import PageLoader from '@/components/PageLoader';
import {
  User,
  FolderKanban,
  TrendingUp,
  Award,
  ArrowUpDown,
  Users,
  BarChart3,
  X,
  ExternalLink,
  MessageSquareText,
  Calculator,
  CalendarDays,
  Info,
} from 'lucide-react';

type SortKey = 'name' | 'grade' | 'semester' | 'members';
type SortDir = 'asc' | 'desc';
type GradeFilter = 'all' | 'graded' | 'passed' | 'failed' | 'ungraded';
type Tab = 'projects' | 'teammates';

const FILTER_LABELS: Record<GradeFilter, string> = {
  all: 'Tous',
  graded: 'Notés',
  passed: 'Réussis',
  failed: 'Échoués',
  ungraded: 'Non notés',
};

interface TeammateStats {
  email: string;
  name: string;
  projects: { name: string; grade: number | null; gradeMax: number | null }[];
  avgPercent: number | null;
  count: number;
}

/** Filter out noise grades like forum ratings */
function isRelevantGrade(g: ProfileGrade): boolean {
  const lower = g.name.toLowerCase();
  if (lower.includes('forum') && lower.includes('rating')) return false;
  if (lower.includes('brainstorming') && lower.includes('rating')) return false;
  return true;
}

function getMainGrade(project: ProfileProject): { grade: number | null; max: number | null; isAverage: boolean } {
  const relevant = project.grades.filter(isRelevantGrade);

  // Detect "Tasks - Day X" pattern → compute average
  const dayGrades = relevant.filter((g) => /tasks\s*-\s*day/i.test(g.name));
  if (dayGrades.length >= 2) {
    const graded = dayGrades.filter((g) => g.grade !== null && g.gradeMax !== null && g.gradeMax > 0);
    if (graded.length > 0) {
      const avgPct = graded.reduce((sum, g) => sum + (g.grade! / g.gradeMax!) * 100, 0) / graded.length;
      return { grade: parseFloat(avgPct.toFixed(1)), max: 100, isAverage: true };
    }
  }

  const projectGrade = relevant.find(
    (g) => g.name.toLowerCase() === 'project' && g.grade !== null,
  );
  if (projectGrade) return { grade: projectGrade.grade, max: projectGrade.gradeMax, isAverage: false };
  const first = relevant.find((g) => g.grade !== null);
  if (first) return { grade: first.grade, max: first.gradeMax, isAverage: false };
  return { grade: null, max: null, isAverage: false };
}

function gradePercent(grade: number | null, max: number | null): number | null {
  if (grade === null || max === null || max === 0) return null;
  return (grade / max) * 100;
}

function gradeColor(percent: number | null): string {
  if (percent === null) return 'text-text-muted dark:text-text-dark-muted';
  if (percent >= 70) return 'text-success';
  if (percent >= 50) return 'text-warning';
  return 'text-danger';
}

function gradeBg(percent: number | null): string {
  if (percent === null) return 'bg-surface-dim/50 dark:bg-surface-dark/50';
  if (percent >= 70) return 'bg-success/10';
  if (percent >= 50) return 'bg-warning/10';
  return 'bg-danger/10';
}

function displayName(courseName: string): string {
  return courseName.replace(/^T-\w+-\d+\s*-\s*/, '');
}

function courseCode(shortname: string): string {
  return shortname.split('_')[0];
}

function emailToName(email: string): string {
  const parts = email.split('@')[0].split('.');
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function formatDateRange(start: number, end: number): string {
  const s = fromUnixTime(start);
  const e = fromUnixTime(end);
  return `${format(s, 'MMM yyyy', { locale: fr })} — ${format(e, 'MMM yyyy', { locale: fr })}`;
}

export default function Profile() {
  const { api, user, curriculum, handleApiError } = useAuth();
  const [projects, setProjects] = useState<ProfileProject[]>([]);
  const [courseDates, setCourseDates] = useState<Map<number, { start: number; end: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('semester');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState<GradeFilter>('all');
  const [tab, setTab] = useState<Tab>('projects');
  const [teammateSortKey, setTeammateSortKey] = useState<'avg' | 'count'>('count');
  const [modalProject, setModalProject] = useState<ProfileProject | null>(null);

  useEffect(() => {
    if (!api) return;
    setLoading(true);

    const loadAll = async () => {
      const [profileProjects, coursesRes] = await Promise.all([
        api.getProfileProjects(/2\b/.test(curriculum ?? '') ? 2 : 1),
        api.getCourses('all', 200),
      ]);
      setProjects(profileProjects);

      const dates = new Map<number, { start: number; end: number }>();
      for (const c of coursesRes.courses) {
        if (c.startdate || c.enddate) {
          dates.set(c.id, { start: c.startdate, end: c.enddate });
        }
      }
      setCourseDates(dates);
    };

    loadAll()
      .catch((e) => {
        handleApiError(e);
        setError(e instanceof Error ? e.message : 'Impossible de charger le profil');
      })
      .finally(() => setLoading(false));
  }, [api]);

  // Stats
  const stats = useMemo(() => {
    const graded = projects.filter((p) => getMainGrade(p).grade !== null);
    const percents = graded
      .map((p) => {
        const { grade, max } = getMainGrade(p);
        return gradePercent(grade, max);
      })
      .filter((p): p is number => p !== null);

    const avg = percents.length > 0 ? percents.reduce((a, b) => a + b, 0) / percents.length : null;
    const passed = percents.filter((p) => p >= 50).length;
    const failed = percents.filter((p) => p < 50).length;

    return {
      total: projects.length,
      graded: graded.length,
      avg,
      passed,
      failed,
      passRate: graded.length > 0 ? (passed / graded.length) * 100 : null,
    };
  }, [projects]);

  // Filtered + sorted projects
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    if (filter !== 'all') {
      list = list.filter((p) => {
        const { grade, max } = getMainGrade(p);
        const pct = gradePercent(grade, max);
        switch (filter) {
          case 'graded': return pct !== null;
          case 'ungraded': return pct === null;
          case 'passed': return pct !== null && pct >= 50;
          case 'failed': return pct !== null && pct < 50;
          default: return true;
        }
      });
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = displayName(a.courseName).localeCompare(displayName(b.courseName));
          break;
        case 'grade': {
          const ga = gradePercent(getMainGrade(a).grade, getMainGrade(a).max) ?? -1;
          const gb = gradePercent(getMainGrade(b).grade, getMainGrade(b).max) ?? -1;
          cmp = ga - gb;
          break;
        }
        case 'semester':
          cmp = a.semester.localeCompare(b.semester);
          break;
        case 'members':
          cmp = (a.group?.members.length ?? 0) - (b.group?.members.length ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [projects, sortKey, sortDir, filter]);

  // Teammate analytics
  const teammates = useMemo(() => {
    const map = new Map<string, TeammateStats>();
    const myEmail = user?.email?.toLowerCase();

    for (const project of projects) {
      if (!project.group) continue;
      const { grade, max } = getMainGrade(project);

      for (const email of project.group.members) {
        const lower = email.toLowerCase();
        if (lower === myEmail) continue;

        if (!map.has(lower)) {
          map.set(lower, { email: lower, name: emailToName(lower), projects: [], avgPercent: null, count: 0 });
        }

        const t = map.get(lower)!;
        t.projects.push({
          name: displayName(project.courseName) || courseCode(project.courseShortname),
          grade,
          gradeMax: max,
        });
        t.count++;
      }
    }

    for (const t of map.values()) {
      const graded = t.projects
        .map((p) => gradePercent(p.grade, p.gradeMax))
        .filter((p): p is number => p !== null);
      t.avgPercent = graded.length > 0 ? graded.reduce((a, b) => a + b, 0) / graded.length : null;
    }

    const list = [...map.values()];
    list.sort((a, b) => {
      if (teammateSortKey === 'count') return b.count - a.count;
      return (b.avgPercent ?? -1) - (a.avgPercent ?? -1);
    });

    return list;
  }, [projects, user, teammateSortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'grade' ? 'desc' : 'asc');
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-danger text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {user?.profileimageurl ? (
          <img
            src={user.profileimageurl}
            alt={user.fullname}
            className="w-16 h-16 rounded-full ring-2 ring-border dark:ring-border-dark"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">{user?.fullname}</h1>
          <p className="text-text-muted dark:text-text-dark-muted">{user?.institution} &middot; {user?.department} &middot; {user?.city}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<FolderKanban className="w-5 h-5" />}
          label="Projets"
          value={stats.total}
          sub={`${stats.graded} notés`}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Moyenne"
          value={stats.avg !== null ? `${stats.avg.toFixed(1)}%` : '-'}
          sub={stats.avg !== null ? (stats.avg >= 70 ? 'Bien' : stats.avg >= 50 ? 'Correct' : 'Faible') : 'Aucune note'}
          color={stats.avg !== null ? gradeColor(stats.avg) : undefined}
          tooltip="Completement biaisé, c'est juste pour la stat."
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Réussis"
          value={stats.passed}
          sub={stats.passRate !== null ? `${stats.passRate.toFixed(0)}% de réussite` : '-'}
          color="text-success"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Échoués"
          value={stats.failed}
          sub={stats.graded > 0 ? `${((stats.failed / stats.graded) * 100).toFixed(0)}% de réussite` : '-'}
          color={stats.failed > 0 ? 'text-danger' : undefined}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border dark:border-border-dark">
        <div className="flex gap-0">
          <TabButton
            active={tab === 'projects'}
            onClick={() => setTab('projects')}
            icon={<FolderKanban className="w-4 h-4" />}
            label="Projets"
            count={filteredProjects.length}
          />
          <TabButton
            active={tab === 'teammates'}
            onClick={() => setTab('teammates')}
            icon={<Users className="w-4 h-4" />}
            label="Coéquipiers"
            count={teammates.length}
          />
        </div>
      </div>

      {/* Tab content */}
      {tab === 'projects' && (
        <section className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(FILTER_LABELS) as GradeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-surface dark:bg-surface-dark-dim text-text-muted dark:text-text-dark-muted hover:bg-surface-dim dark:hover:bg-surface-dark border border-border dark:border-border-dark'
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border dark:border-border-dark overflow-hidden">
            <div className="overflow-x-auto">
            <div className="min-w-[520px]">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_140px_120px_90px] gap-2 px-4 py-3 bg-surface-dim/50 dark:bg-surface-dark/50 border-b border-border dark:border-border-dark text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase tracking-wide">
              <SortButton label="Projet" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortButton label="Semestre" sortKey="semester" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortButton label="Note" sortKey="grade" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortButton label="Équipe" sortKey="members" current={sortKey} dir={sortDir} onClick={toggleSort} />
            </div>

            {filteredProjects.length === 0 ? (
              <div className="px-4 py-12 text-center text-text-muted dark:text-text-dark-muted bg-surface dark:bg-surface-dark-dim">
                Aucun projet ne correspond à ce filtre.
              </div>
            ) : (
              filteredProjects.map((project) => {
                const { grade, max, isAverage } = getMainGrade(project);
                const pct = gradePercent(grade, max);
                const code = courseCode(project.courseShortname);
                const name = displayName(project.courseName) || code;
                const relevantGrades = project.grades.filter(isRelevantGrade);
                const hasFeedback = relevantGrades.some((g) => g.feedback);
                const dates = project.courseId ? courseDates.get(project.courseId) : undefined;

                return (
                  <button
                    key={project.courseShortname}
                    onClick={() => setModalProject(project)}
                    className="w-full grid grid-cols-[1fr_140px_120px_90px] gap-2 px-4 py-3 text-left hover:bg-surface-dim/50 dark:hover:bg-surface-dark/50 transition-colors border-b border-border/50 dark:border-border-dark/50 last:border-b-0 bg-surface dark:bg-surface-dark-dim"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${pct !== null ? (pct >= 70 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger') : 'bg-border dark:bg-border-dark'}`} />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-text dark:text-text-dark truncate block">
                          {name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-text-muted dark:text-text-dark-muted">{code}</span>
                          {dates && (
                            <span className="text-[11px] text-text-muted/60 dark:text-text-dark-muted/60 hidden sm:inline">
                              {formatDateRange(dates.start, dates.end)}
                            </span>
                          )}
                          {hasFeedback && (
                            <MessageSquareText className="w-3 h-3 text-primary/60" />
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-text-muted dark:text-text-dark-muted self-center">
                      {project.semester.replace(/^MSC\d+\s*-\s*/, '')}
                    </span>
                    <div className="self-center">
                      {pct !== null ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${gradeBg(pct)} ${gradeColor(pct)}`} title={isAverage ? 'Moyenne calculée' : undefined}>
                          {isAverage && <Calculator className="w-3.5 h-3.5 opacity-60" />}
                          {pct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted dark:text-text-dark-muted">-</span>
                      )}
                    </div>
                    <span className="text-sm text-text-muted dark:text-text-dark-muted self-center">
                      {project.group ? project.group.members.length : '-'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          </div>
          </div>
        </section>
      )}

      {tab === 'teammates' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTeammateSortKey('count')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                teammateSortKey === 'count'
                  ? 'bg-primary text-white'
                  : 'bg-surface dark:bg-surface-dark-dim text-text-muted dark:text-text-dark-muted hover:bg-surface-dim dark:hover:bg-surface-dark border border-border dark:border-border-dark'
              }`}
            >
              Plus fréquents
            </button>
            <button
              onClick={() => setTeammateSortKey('avg')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                teammateSortKey === 'avg'
                  ? 'bg-primary text-white'
                  : 'bg-surface dark:bg-surface-dark-dim text-text-muted dark:text-text-dark-muted hover:bg-surface-dim dark:hover:bg-surface-dark border border-border dark:border-border-dark'
              }`}
            >
              Meilleure moyenne
            </button>
          </div>

          {teammates.length === 0 ? (
            <div className="text-center py-12 text-text-muted dark:text-text-dark-muted">
              Aucun coéquipier trouvé.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teammates.map((t) => (
                <div
                  key={t.email}
                  className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text dark:text-text-dark">{t.name}</p>
                        <p className="text-xs text-text-muted dark:text-text-dark-muted">
                          {t.count} projet{t.count > 1 ? 's' : ''} ensemble
                        </p>
                      </div>
                    </div>
                    {t.avgPercent !== null && (
                      <span className={`text-lg font-bold ${gradeColor(t.avgPercent)}`}>
                        {t.avgPercent.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {t.projects.map((p, i) => {
                      const pct = gradePercent(p.grade, p.gradeMax);
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-text-muted dark:text-text-dark-muted truncate mr-2">{p.name}</span>
                          {pct !== null ? (
                            <span className={`font-medium flex-shrink-0 ${gradeColor(pct)}`}>
                              {pct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-text-muted dark:text-text-dark-muted flex-shrink-0">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Project detail modal */}
      {modalProject && (
        <ProjectModal
          project={modalProject}
          userEmail={user?.email ?? ''}
          dates={modalProject.courseId ? courseDates.get(modalProject.courseId) : undefined}
          onClose={() => setModalProject(null)}
        />
      )}
    </div>
  );
}

// ---- Sub-components ----

function ProjectModal({
  project,
  userEmail,
  dates,
  onClose,
}: {
  project: ProfileProject;
  userEmail: string;
  dates?: { start: number; end: number };
  onClose: () => void;
}) {
  const { grade, max, isAverage } = getMainGrade(project);
  const pct = gradePercent(grade, max);
  const code = courseCode(project.courseShortname);
  const name = displayName(project.courseName) || code;
  const relevantGrades = project.grades.filter(isRelevantGrade);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim shadow-2xl animate-modal-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 pt-5 pb-4 bg-surface dark:bg-surface-dark-dim border-b border-border dark:border-border-dark">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-text dark:text-text-dark truncate">{name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-text-muted dark:text-text-dark-muted">{code}</span>
              <span className="text-xs text-text-muted dark:text-text-dark-muted">&middot;</span>
              <span className="text-xs text-text-muted dark:text-text-dark-muted">{project.semester.replace(/^MSC\d+\s*-\s*/, '')}</span>
              {dates && (
                <>
                  <span className="text-xs text-text-muted dark:text-text-dark-muted">&middot;</span>
                  <span className="inline-flex items-center gap-1 text-xs text-text-muted dark:text-text-dark-muted">
                    <CalendarDays className="w-3 h-3" />
                    {formatDateRange(dates.start, dates.end)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {pct !== null && (
              <span className={`text-xl font-bold flex items-center gap-1 ${gradeColor(pct)}`} title={isAverage ? 'Moyenne calculée' : undefined}>
                {isAverage && <Calculator className="w-4 h-4 opacity-60" />}
                {pct.toFixed(1)}%
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted dark:text-text-dark-muted hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Grades breakdown */}
          {relevantGrades.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase tracking-wide mb-3">Détail des notes</p>
              <div className="space-y-2">
                {relevantGrades.map((g, i) => {
                  const p = gradePercent(g.grade, g.gradeMax);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text dark:text-text-dark">{g.name}</span>
                        {p !== null ? (
                          <span className={`text-sm font-semibold ${gradeColor(p)}`}>
                            {p.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-sm text-text-muted dark:text-text-dark-muted">-</span>
                        )}
                      </div>
                      {/* Progress bar */}
                      {g.gradeMax !== null && g.gradeMax > 0 && (
                        <div className="h-1.5 rounded-full bg-surface-dim dark:bg-surface-dark overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${p !== null ? (p >= 70 ? 'bg-success' : p >= 50 ? 'bg-warning' : 'bg-danger') : 'bg-border dark:bg-border-dark'}`}
                            style={{ width: `${Math.min(p ?? 0, 100)}%` }}
                          />
                        </div>
                      )}
                      {/* Feedback */}
                      {g.feedback && (
                        <details className="mt-1 rounded-lg bg-surface-dim/50 dark:bg-surface-dark/50 group">
                          <summary className="flex items-center gap-2 px-2.5 py-2 cursor-pointer text-xs text-primary/80 hover:text-primary transition-colors select-none">
                            <MessageSquareText className="w-3.5 h-3.5 flex-shrink-0" />
                            Commentaire
                          </summary>
                          <p className="px-2.5 pb-2.5 text-xs text-text-muted dark:text-text-dark-muted leading-relaxed whitespace-pre-line">{g.feedback}</p>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team */}
          {project.group && (
            <div>
              <p className="text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase tracking-wide mb-3">
                Équipe &mdash; {project.group.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {project.group.members.map((email) => {
                  const memberName = emailToName(email);
                  const isMe = email.toLowerCase() === userEmail.toLowerCase();
                  return (
                    <span
                      key={email}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${
                        isMe
                          ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary/20'
                          : 'bg-surface-dim dark:bg-surface-dark text-text dark:text-text-dark'
                      }`}
                      title={email}
                    >
                      <Users className="w-3 h-3" />
                      {memberName}
                      {isMe && <span className="text-[10px] opacity-60">(moi)</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Link to Gandalf */}
          {project.courseId && (
            <a
              href={`https://gandalf.epitech.eu/course/view.php?id=${project.courseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir sur Gandalf
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color?: string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim p-4">
      <div className="flex items-center gap-2 mb-2 text-text-muted dark:text-text-dark-muted">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        {tooltip && (
          <span className="relative group ml-auto">
            <Info className="w-3.5 h-3.5 text-text-muted/50 dark:text-text-dark-muted/50 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-text dark:bg-text-dark text-surface dark:text-surface-dark text-[11px] leading-relaxed w-48 text-center opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-10">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${color || 'text-text dark:text-text-dark'}`}>{value}</p>
      <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">{sub}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${
        active
          ? 'text-primary'
          : 'text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark'
      }`}
    >
      {icon}
      {label}
      <span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs ${
        active
          ? 'bg-primary/10 text-primary'
          : 'bg-surface-dim dark:bg-surface-dark text-text-muted dark:text-text-dark-muted'
      }`}>
        {count}
      </span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
      )}
    </button>
  );
}

function SortButton({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const isActive = current === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className="flex items-center gap-1 hover:text-text dark:hover:text-text-dark transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${isActive ? 'text-primary' : 'opacity-40'}`} />
      {isActive && (
        <span className="text-primary text-[10px]">{dir === 'asc' ? '\u2191' : '\u2193'}</span>
      )}
    </button>
  );
}
