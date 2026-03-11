import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import type { CourseState, CourseModule, GradingResult, Course, CalendarEvent } from '@/lib/gandalf-api';
import PageLoader from '@/components/PageLoader';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Circle,
  FileText,
  Users,
  MessageSquare,
  FolderOpen,
  ClipboardCheck,
  HelpCircle,
  Link as LinkIcon,
  Trophy,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { format, fromUnixTime, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const MODULE_ICONS: Record<string, typeof FileText> = {
  assign: ClipboardCheck,
  forum: MessageSquare,
  folder: FolderOpen,
  groupselect: Users,
  quiz: HelpCircle,
  feedback: FileText,
  workshop: Users,
  resource: FileText,
  url: LinkIcon,
  label: FileText,
};

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { api, handleApiError } = useAuth();
  const [courseState, setCourseState] = useState<CourseState | null>(null);
  const [achievements, setAchievements] = useState<GradingResult[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const courseid = Number(id);

  useEffect(() => {
    if (!api || !courseid) return;

    const load = async () => {
      try {
        const [state, coursesRes, eventsRes] = await Promise.all([
          api.getCourseState(courseid),
          api.getCourses('all', 50),
          api.getEventsByCourse(courseid, 20),
        ]);
        setCourseState(state);
        setCourse(coursesRes.courses.find((c) => c.id === courseid) ?? null);
        setEvents(eventsRes.events);

        // Expand all sections by default
        setExpandedSections(new Set(state.section.map((s) => s.id)));

        // Achievements may fail (not all courses have them)
        try {
          const ach = await api.getAchievements(courseid);
          setAchievements(ach);
        } catch {
          // Not all courses have achievements
        }
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api, courseid]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!courseState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-muted dark:text-text-dark-muted">
        <p className="text-sm">Impossible de charger ce cours</p>
        <Link to="/courses" className="mt-3 text-primary text-sm hover:underline">
          Retour aux cours
        </Link>
      </div>
    );
  }

  const displayName = course?.fullname?.replace(/^T-\w+-\d+\s*-\s*/, '') ?? `Cours #${courseid}`;
  const projectCode = course?.shortname?.split('_')[0] ?? '';
  const progress = course?.progress ?? 0;

  const cmMap = new Map(courseState.cm.map((m) => [m.id, m]));

  const totalAchievements = achievements.reduce((s, g) => s + g.count_achievements, 0);
  const passedAchievements = achievements.reduce((s, g) => s + g.count_achievements_success, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/courses"
          className="shrink-0 mt-1 p-2 rounded-xl text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface dark:hover:bg-surface-dark-dim transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-text-muted dark:text-text-dark-muted">
              {projectCode}
            </span>
            {course?.coursecategory && (
              <span className="bg-primary/10 text-primary text-xs font-medium rounded-md px-2 py-0.5">
                {course.coursecategory}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text dark:text-text-dark mt-1">
            {displayName}
          </h1>
          {course?.hasprogress && (
            <div className="flex items-center gap-3 mt-3 max-w-md">
              <div className="flex-1 h-2 rounded-full bg-surface-dim dark:bg-surface-dark overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress === 100 ? 'bg-success' : progress >= 50 ? 'bg-primary' : progress > 0 ? 'bg-warning' : 'bg-border dark:bg-border-dark'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-text dark:text-text-dark tabular-nums">
                {progress}%
              </span>
            </div>
          )}
        </div>
        {course?.courseimage && (
          <img
            src={course.courseimage}
            alt=""
            className="shrink-0 w-16 h-16 rounded-xl object-cover hidden sm:block"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Sections & Modules */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Contenu du cours
          </h2>
          {courseState.section
            .filter((s) => s.visible)
            .map((section) => {
              const modules = section.cmlist
                .map((cmid) => cmMap.get(cmid))
                .filter((m): m is CourseModule => !!m && m.uservisible);
              const isExpanded = expandedSections.has(section.id);

              return (
                <div
                  key={section.id}
                  className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-dim/50 dark:hover:bg-surface-dark/30 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0 text-text-muted dark:text-text-dark-muted" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0 text-text-muted dark:text-text-dark-muted" />
                    )}
                    <span className="font-semibold text-sm text-text dark:text-text-dark">
                      {section.title || `Section ${section.number}`}
                    </span>
                    <span className="text-xs text-text-muted dark:text-text-dark-muted ml-auto">
                      {modules.length} activité{modules.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  {isExpanded && modules.length > 0 && (
                    <div className="border-t border-border/50 dark:border-border-dark/50">
                      {modules.map((mod) => (
                        <ModuleRow key={mod.id} mod={mod} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-4">
              <h3 className="text-sm font-semibold text-text dark:text-text-dark flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-warning" />
                Achievements
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-dim dark:text-surface-dark" />
                    <circle
                      cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4"
                      className="text-success"
                      strokeDasharray={`${(passedAchievements / Math.max(totalAchievements, 1)) * 150.8} 150.8`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text dark:text-text-dark">
                    {passedAchievements}/{totalAchievements}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text dark:text-text-dark">
                    {passedAchievements} validé{passedAchievements !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-text-muted dark:text-text-dark-muted">
                    sur {totalAchievements} critère{totalAchievements !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {achievements.map((grading) => (
                <div key={grading.grading_id} className="mb-3 last:mb-0">
                  <p className="text-xs font-semibold text-text dark:text-text-dark mb-1.5">
                    {grading.grading_name}
                    <span className="font-normal text-text-muted dark:text-text-dark-muted ml-1.5">
                      ({grading.count_achievements_success}/{grading.count_achievements})
                    </span>
                  </p>
                  <div className="space-y-1">
                    {grading.achievements.map((a, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {a.achievement_grade === 1 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-success" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-text-muted/30 dark:text-text-dark-muted/30" />
                        )}
                        <span className={`text-xs leading-snug ${
                          a.achievement_grade === 1
                            ? 'text-text dark:text-text-dark'
                            : 'text-text-muted dark:text-text-dark-muted'
                        }`}>
                          {a.achievement_description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming events */}
          {events.length > 0 && (
            <div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-4">
              <h3 className="text-sm font-semibold text-text dark:text-text-dark flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                Échéances
              </h3>
              <div className="space-y-2">
                {events.slice(0, 5).map((ev) => {
                  const date = fromUnixTime(ev.timesort);
                  const relative = formatDistanceToNow(date, { addSuffix: true, locale: fr });
                  return (
                    <a
                      key={ev.id}
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2.5 p-2 -mx-2 rounded-lg hover:bg-surface-dim/50 dark:hover:bg-surface-dark/30 transition-colors"
                    >
                      {ev.overdue ? (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-danger" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-text-muted dark:text-text-dark-muted" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text dark:text-text-dark truncate">
                          {ev.activityname || ev.name}
                        </p>
                        <p className={`text-[11px] ${ev.overdue ? 'text-danger' : 'text-text-muted dark:text-text-dark-muted'}`}>
                          {relative} — {format(date, 'd MMM, HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ mod }: { mod: CourseModule }) {
  const Icon = MODULE_ICONS[mod.module] ?? FileText;
  const completed = mod.completionstate === 1 || mod.isoverallcomplete;

  if (mod.module === 'label') return null;

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-dim/50 dark:hover:bg-surface-dark/30 transition-colors">
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        completed ? 'bg-success/10' : 'bg-primary/10'
      }`}>
        <Icon className={`w-4 h-4 ${completed ? 'text-success' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text dark:text-text-dark truncate">
          {mod.name}
        </p>
        <p className="text-[11px] text-text-muted dark:text-text-dark-muted capitalize">
          {mod.modname}
        </p>
      </div>
      {completed && (
        <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
      )}
      {mod.url && (
        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-text-muted/30 dark:text-text-dark-muted/30" />
      )}
    </div>
  );

  return mod.url ? (
    <a href={mod.url} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}
