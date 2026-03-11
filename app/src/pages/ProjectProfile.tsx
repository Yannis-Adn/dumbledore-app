import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import type {
  Course,
  CourseModule,
  GradingResult,
  ModuleFile,
  ProfileProject,
} from '@/lib/gandalf-api';
import PageLoader from '@/components/PageLoader';
import {
  Loader2,
  ArrowLeft,
  Trophy,
  CheckCircle2,
  XCircle,
  Circle,
  User,
  CalendarDays,
  MessageSquare,
  Users,
  Mail,
  FileText,
  Download,
  ChevronDown,
  Info,
} from 'lucide-react';

interface DownloadableDoc {
  label: string;
  file: ModuleFile;
}

interface ProjectData {
  course: Course | null;
  assignModules: CourseModule[];
  achievements: GradingResult[];
  downloads: DownloadableDoc[];
  profileProject: ProfileProject | null;
}

// Persist checklist state per course in localStorage
function getChecklistKey(courseId: string) {
  return `dumbledore_checklist_${courseId}`;
}

function loadChecklist(courseId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(getChecklistKey(courseId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecklist(courseId: string, checked: Record<string, boolean>) {
  localStorage.setItem(getChecklistKey(courseId), JSON.stringify(checked));
}

// Grade color coding
type GradeLevel = 'danger' | 'orange' | 'success' | 'gold';

function getGradeLevel(ratio: number): GradeLevel {
  if (ratio >= 0.9) return 'gold';
  if (ratio >= 0.7) return 'success';
  if (ratio >= 0.5) return 'orange';
  return 'danger';
}

function getGradeTextClass(level: GradeLevel): string {
  switch (level) {
    case 'danger': return 'text-danger';
    case 'orange': return 'text-orange-500 dark:text-orange-400';
    case 'success': return 'text-success';
    case 'gold': return 'text-warning';
  }
}

function getGradeBgClass(level: GradeLevel): string {
  switch (level) {
    case 'danger': return 'bg-danger';
    case 'orange': return 'bg-orange-500';
    case 'success': return 'bg-success';
    case 'gold': return 'bg-warning';
  }
}

function GradeInfoTooltip() {
  return (
    <button className="relative group" tabIndex={0}>
      <Info className="w-3.5 h-3.5 text-text-muted/50 dark:text-text-dark-muted/50 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 rounded-lg bg-surface-dark-dim dark:bg-surface text-text-dark dark:text-text text-xs leading-relaxed whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-10 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
            <span>0–49% — Insuffisant</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            <span>50–69% — Moyen</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success shrink-0" />
            <span>70–89% — Bien</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
            <span>90–100% — Excellent</span>
          </div>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-surface-dark-dim dark:border-t-surface" />
      </div>
    </button>
  );
}

export default function ProjectProfile() {
  const { courseId } = useParams<{ courseId: string }>();
  const { api, curriculum, handleApiError } = useAuth();
  const [data, setData] = useState<ProjectData>({
    course: null,
    assignModules: [],
    achievements: [],
    downloads: [],
    profileProject: null,
  });
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [phase2Loading, setPhase2Loading] = useState(true);
  const [downloadingLabel, setDownloadingLabel] = useState<string | null>(null);
  const [groupExpanded, setGroupExpanded] = useState(false);

  // Load checklist from localStorage on mount
  useEffect(() => {
    if (courseId) setCheckedItems(loadChecklist(courseId));
  }, [courseId]);

  const toggleCheck = useCallback(
    (key: string) => {
      if (!courseId) return;
      setCheckedItems((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        saveChecklist(courseId, next);
        return next;
      });
    },
    [courseId],
  );

  // Phase 1: Fast AJAX calls — show UI immediately
  useEffect(() => {
    if (!api || !courseId) return;
    let cancelled = false;

    const loadFast = async () => {
      try {
        const cid = parseInt(courseId);

        const [coursesRes, courseState, achievements] = await Promise.all([
          api.getRecentCourses(50),
          api.getCourseState(cid),
          api.getAchievements(cid),
        ]);

        if (cancelled) return;

        let course = coursesRes.find((c) => c.id === cid) ?? null;
        if (!course) {
          const allCourses = await api.getCourses('all', 100);
          if (cancelled) return;
          course = allCourses.courses.find((c) => c.id === cid) ?? null;
        }

        const assignModules = courseState.cm.filter(
          (m) => m.module === 'assign' && m.uservisible,
        );

        setData((prev) => ({ ...prev, course, assignModules, achievements }));
        setLoading(false);

        // Phase 2: All scrapes in parallel — enrich UI progressively
        // Kick-off slides are in a folder module
        const kickoff = courseState.cm.find(
          (m) => m.module === 'folder' && /kick.?off/i.test(m.name),
        );
        // Bootstrap can be a folder OR an assignment (varies by course)
        const bootstrap = courseState.cm.find(
          (m) => (m.module === 'folder' || m.module === 'assign') && /bootstrap/i.test(m.name),
        );
        // Project assignment — find one explicitly named "project", excluding bootstrap
        const projectAssign = assignModules.find(
          (m) => /^project$/i.test(m.name.trim()) || (/project/i.test(m.name) && !/bootstrap/i.test(m.name)),
        ) ?? assignModules.find((m) => m.id !== bootstrap?.id);

        const modPageUrl = (m: CourseModule) =>
          m.module === 'folder'
            ? `/mod/folder/view.php?id=${m.id}`
            : `/mod/assign/view.php?id=${m.id}`;

        const [profileProjects, kickoffFiles, bootstrapFiles, projectFiles] =
          await Promise.all([
            api.getProfileProjects(/2\b/.test(curriculum ?? '') ? 2 : 1).catch(() => [] as ProfileProject[]),
            kickoff
              ? api.getModuleFiles(modPageUrl(kickoff)).catch(() => [])
              : Promise.resolve([]),
            bootstrap
              ? api.getModuleFiles(modPageUrl(bootstrap)).catch(() => [])
              : Promise.resolve([]),
            projectAssign
              ? api.getModuleFiles(modPageUrl(projectAssign)).catch(() => [])
              : Promise.resolve([]),
          ]);

        if (cancelled) return;

        const downloads: DownloadableDoc[] = [];
        if (kickoffFiles.length > 0)
          downloads.push({ label: 'Kick-off', file: kickoffFiles[0] });
        if (bootstrapFiles.length > 0)
          downloads.push({ label: 'Bootstrap', file: bootstrapFiles[0] });
        if (projectFiles.length > 0)
          downloads.push({ label: 'Projet', file: projectFiles[0] });

        const profileProject = profileProjects.find(
          (p) => p.courseId === cid || (course && p.courseShortname === course.shortname),
        ) ?? null;

        setData((prev) => ({ ...prev, downloads, profileProject }));
        setPhase2Loading(false);
      } catch (e) {
        handleApiError(e);
        setLoading(false);
        setPhase2Loading(false);
      }
    };

    loadFast();
    return () => { cancelled = true; };
  }, [api, courseId]);

  const handleDownload = useCallback(
    async (dl: DownloadableDoc) => {
      if (!api || downloadingLabel) return;
      setDownloadingLabel(dl.label);
      try {
        const { blob, filename } = await api.downloadFile(dl.file.url);
        if (blob.type === 'text/html') {
          console.error('Download returned HTML instead of file — likely auth/redirect issue for:', dl.file.url);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        console.error('Download failed:', e);
      } finally {
        setDownloadingLabel(null);
      }
    },
    [api, downloadingLabel],
  );

  if (loading) {
    return <PageLoader />;
  }

  const { course, achievements, profileProject } = data;
  if (!course) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-text-muted dark:text-text-dark-muted">Cours introuvable.</p>
      </div>
    );
  }

  const projectCode = course.shortname.split('_')[0];
  const displayName = course.fullname.replace(/^T-\w+-\d+\s*-\s*/, '');
  const pp = profileProject;

  // Aggregate achievement stats (from fast AJAX — available immediately)
  const totalCriteria = achievements.reduce((s, g) => s + g.count_achievements, 0);
  const passedCriteria = achievements.reduce((s, g) => s + g.count_achievements_success, 0);

  // Extract grading info from achievements API (instant, no scrape needed)
  const firstRatedAchievement = achievements
    .flatMap((g) => g.achievements)
    .find((a) => a.rater_name !== null);
  const isGraded = firstRatedAchievement !== undefined;

  // Grade: compute from achievements ratio, fallback to profile scrape
  const achievementGrade = totalCriteria > 0 && isGraded
    ? { score: Math.round((passedCriteria / totalCriteria) * 10000) / 100, max: 100 }
    : null;
  const profileGrade = pp?.grades.find((g) => g.grade !== null);
  const grade = profileGrade
    ? { score: profileGrade.grade!, max: profileGrade.gradeMax ?? 100 }
    : achievementGrade;

  // Corrector & date from achievements (instant)
  const gradedBy = firstRatedAchievement?.rater_name
    ?.replace(/@epitech\.eu$/, '')
    .split('.')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ') ?? null;
  const gradedOn = firstRatedAchievement?.grade_date ?? null;

  // Group & feedback from profile scrape (lazy, may not be loaded yet)
  const feedback = pp?.grades.find((g) => g.feedback)?.feedback ?? null;
  const groupName = pp?.group?.name ?? null;
  const groupMembers = pp?.group?.members ?? [];

  // Color coding
  const gradeLevel = grade ? getGradeLevel(grade.score / grade.max) : null;
  const criteriaLevel = totalCriteria > 0 ? getGradeLevel(passedCriteria / totalCriteria) : null;

  const hasSidebar = grade !== null || totalCriteria > 0 || gradedBy || gradedOn || groupName || phase2Loading;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted dark:text-text-dark-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au dashboard
      </Link>

      {/* Course header */}
      <div className="flex items-start gap-4 mb-8">
        <img
          src={course.courseimage}
          alt=""
          className="w-16 h-16 rounded-xl object-cover bg-primary/10 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-text-muted dark:text-text-dark-muted">
            {projectCode} · {course.coursecategory}
          </p>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark mt-0.5">
            {displayName}
          </h1>
          {isGraded && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-amber-600/15 text-amber-700 dark:bg-warning/10 dark:text-warning text-xs font-medium">
              <Trophy className="w-3.5 h-3.5" />
              Noté
            </span>
          )}
          {!isGraded && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-text-muted/10 text-text-muted dark:text-text-dark-muted text-xs font-medium">
              En attente de notation
            </span>
          )}
        </div>

        {/* Download buttons */}
        <div className="shrink-0 flex flex-wrap gap-2">
          {phase2Loading ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted dark:text-text-dark-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Chargement…
            </div>
          ) : (
            data.downloads.map((dl) => {
              const isDownloading = downloadingLabel === dl.label;
              return (
                <button
                  key={dl.label}
                  onClick={() => handleDownload(dl)}
                  disabled={isDownloading}
                  title={`Télécharger ${dl.file.name}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-dim dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-text-dark hover:border-primary/50 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-wait"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {dl.label}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Two-column layout: sidebar + main content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT: Sticky sidebar */}
        {hasSidebar && (
          <aside className="shrink-0 lg:w-[280px] lg:sticky lg:top-20 lg:self-start space-y-3">
            {/* Note */}
            {grade && (
              <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-text-muted dark:text-text-dark-muted">Note</p>
                  <GradeInfoTooltip />
                </div>
                <p className={`text-2xl font-bold ${getGradeTextClass(gradeLevel!)}`}>
                  {((grade.score / grade.max) * 100).toFixed(1)}%
                </p>
                <div className="mt-2.5 h-1.5 rounded-full bg-surface-dim dark:bg-surface-dark overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getGradeBgClass(gradeLevel!)}`}
                    style={{ width: `${(grade.score / grade.max) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Criteres reussis */}
            {totalCriteria > 0 && (
              <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-text-muted dark:text-text-dark-muted">Critères réussis</p>
                  <GradeInfoTooltip />
                </div>
                <p className={`text-2xl font-bold ${criteriaLevel ? getGradeTextClass(criteriaLevel) : 'text-text dark:text-text-dark'}`}>
                  {passedCriteria}
                  <span className="text-sm font-normal text-text-muted dark:text-text-dark-muted">
                    {' '}/ {totalCriteria}
                  </span>
                </p>
                <div className="mt-2.5 h-1.5 rounded-full bg-surface-dim dark:bg-surface-dark overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${criteriaLevel ? getGradeBgClass(criteriaLevel) : 'bg-border dark:bg-border-dark'}`}
                    style={{ width: `${totalCriteria ? (passedCriteria / totalCriteria) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Correcteur */}
            {gradedBy && (
              <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-4">
                <p className="text-xs text-text-muted dark:text-text-dark-muted mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Correcteur
                </p>
                <p className="text-sm font-medium text-text dark:text-text-dark">{gradedBy}</p>
              </div>
            )}

            {/* Note le */}
            {gradedOn && (
              <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-4">
                <p className="text-xs text-text-muted dark:text-text-dark-muted mb-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Noté le
                </p>
                <p className="text-sm font-medium text-text dark:text-text-dark">{gradedOn}</p>
              </div>
            )}

            {/* Groupe — collapsible */}
            {groupName && (
              <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark overflow-hidden">
                <button
                  onClick={() => setGroupExpanded(!groupExpanded)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-dim/50 dark:hover:bg-surface-dark/30 transition-colors"
                >
                  <div>
                    <p className="text-xs text-text-muted dark:text-text-dark-muted flex items-center gap-1">
                      <Users className="w-3 h-3" /> Groupe
                    </p>
                    <p className="text-sm font-medium text-text dark:text-text-dark mt-1">
                      {groupName}
                    </p>
                  </div>
                  {groupMembers.length > 0 && (
                    <ChevronDown
                      className={`w-4 h-4 text-text-muted dark:text-text-dark-muted transition-transform duration-200 ${
                        groupExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>
                {groupExpanded && groupMembers.length > 0 && (
                  <div className="border-t border-border dark:border-border-dark divide-y divide-border/50 dark:divide-border-dark/50 max-h-48 overflow-y-auto">
                    {groupMembers.map((email) => (
                      <div key={email} className="px-4 py-2.5 flex items-center gap-2.5">
                        <Mail className="w-3.5 h-3.5 text-text-muted dark:text-text-dark-muted shrink-0" />
                        <span className="text-xs text-text dark:text-text-dark truncate">
                          {email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Phase 2 loading indicator */}
            {phase2Loading && (
              <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-text-muted dark:text-text-dark-muted" />
                <span className="text-xs text-text-muted dark:text-text-dark-muted">Chargement…</span>
              </div>
            )}
          </aside>
        )}

        {/* RIGHT: Main content */}
        <div className="flex-1 min-w-0">
          {/* Feedback comments */}
          {feedback && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4" />
                Commentaires du correcteur
              </h2>
              <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-5">
                <p className="text-sm text-text dark:text-text-dark whitespace-pre-wrap leading-relaxed">
                  {feedback}
                </p>
              </div>
            </section>
          )}

          {/* Achievement criteria */}
          {achievements.length > 0 && (() => {
            // Checklist progress (only when not graded)
            const allKeys = achievements.flatMap((g) =>
              g.achievements.map((a) => `${g.grading_id}_${a.achievement_name}`),
            );
            const checkedCount = allKeys.filter((k) => checkedItems[k]).length;

            return (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" />
                  {isGraded ? "Critères d'évaluation" : 'Checklist des critères'}
                </h2>

                {/* Progress bar for checklist mode */}
                {!isGraded && allKeys.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-muted dark:text-text-dark-muted">
                        Progression personnelle
                      </span>
                      <span className="text-xs font-medium text-text dark:text-text-dark">
                        {checkedCount} / {allKeys.length}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-dim dark:bg-surface-dark overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          checkedCount === allKeys.length
                            ? 'bg-success'
                            : checkedCount > 0
                              ? 'bg-primary'
                              : 'bg-border dark:bg-border-dark'
                        }`}
                        style={{ width: `${allKeys.length ? (checkedCount / allKeys.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {achievements.map((grading) => {
                  const gradingKeys = grading.achievements.map(
                    (a) => `${grading.grading_id}_${a.achievement_name}`,
                  );
                  const gradingChecked = gradingKeys.filter((k) => checkedItems[k]).length;

                  return (
                    <div
                      key={grading.grading_id}
                      className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark overflow-hidden mb-4"
                    >
                      <div className="px-5 py-3 border-b border-border dark:border-border-dark flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-text dark:text-text-dark">
                          {grading.grading_name}
                        </h3>
                        <span className="text-xs text-text-muted dark:text-text-dark-muted">
                          {isGraded
                            ? `${grading.count_achievements_success} / ${grading.count_achievements}`
                            : `${gradingChecked} / ${grading.count_achievements}`}
                        </span>
                      </div>
                      <div className="divide-y divide-border dark:divide-border-dark">
                        {grading.achievements.map((a) => {
                          const key = `${grading.grading_id}_${a.achievement_name}`;
                          const checked = checkedItems[key];

                          return (
                            <div
                              key={a.achievement_name}
                              className={`px-5 py-3 flex items-start gap-3 ${
                                !isGraded
                                  ? 'cursor-pointer hover:bg-surface-dim/50 dark:hover:bg-surface-dark/30 transition-colors'
                                  : ''
                              }`}
                              onClick={!isGraded ? () => toggleCheck(key) : undefined}
                            >
                              {/* Icon: graded = result icon, not graded = toggleable checkbox */}
                              {isGraded ? (
                                a.achievement_grade === 1 ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                )
                              ) : checked ? (
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5 transition-colors" />
                              ) : (
                                <Circle className="w-4 h-4 text-text-muted/40 dark:text-text-dark-muted/40 shrink-0 mt-0.5 transition-colors" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium transition-colors ${
                                    !isGraded && checked
                                      ? 'text-text-muted dark:text-text-dark-muted line-through'
                                      : 'text-text dark:text-text-dark'
                                  }`}
                                >
                                  {a.achievement_name}
                                </p>
                                <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
                                  {a.achievement_description}
                                </p>
                                {a.achievement_remark && (
                                  <p className="text-xs text-accent mt-1.5 italic">
                                    &ldquo;{a.achievement_remark}&rdquo;
                                    {a.rater_name && (
                                      <span className="not-italic text-text-muted dark:text-text-dark-muted">
                                        {' '}— {a.rater_name}
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })()}

          {/* No data state */}
          {achievements.length === 0 && (
            <div className="text-center py-16 text-text-muted dark:text-text-dark-muted">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Aucune donnée de notation disponible pour ce projet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
