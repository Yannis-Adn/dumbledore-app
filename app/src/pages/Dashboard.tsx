import { useEffect, useState, useMemo } from 'react';
import { addMonths, subMonths } from 'date-fns';
import { useAuth } from '@/context/auth';
import type { CalendarEvent, Course, GradingResult } from '@/lib/gandalf-api';
import type { PanoramixEvent, PanoramixEventDetail } from '@/lib/panoramix-api';
import GanttChart, { PROJECT_COLORS } from '@/components/GanttChart';
import DashboardCalendar from '@/components/DashboardCalendar';
import RecentProjectCard from '@/components/RecentProjectCard';
import { TokenExpiredError } from '@/lib/errors';
import { hasPlanningData } from '@/lib/planning';
import {
  CalendarDays,
  Calendar,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import PageLoader from '@/components/PageLoader';

export default function Dashboard() {
  const { api, panoramixApi, user, userid, curriculum, handleApiError } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [panoramixEvents, setPanoramixEvents] = useState<PanoramixEvent[]>([]);
  const [eventDetailsMap, setEventDetailsMap] = useState<Map<string, PanoramixEventDetail>>(new Map());
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [activeCourses, setActiveCourses] = useState<Course[]>([]);
  const [courseGrades, setCourseGrades] = useState<Map<number, GradingResult[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !userid) return;

    const load = async () => {
      try {
        const [eventsRes, recent, active] = await Promise.all([
          api.getActionEvents(undefined, 30),
          api.getRecentCourses(8),
          api.getCourses('inprogress', 50),
        ]);
        setEvents(eventsRes.events);
        setRecentCourses(recent);
        setActiveCourses(active.courses);

        // Load achievements in parallel to detect graded projects
        const achievementResults = await Promise.allSettled(
          recent.map((c) => api.getAchievements(c.id)),
        );
        const grades = new Map<number, GradingResult[]>();
        achievementResults.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            const hasGrade = result.value.some((g: GradingResult) =>
              g.achievements.some((a) => a.rater_name !== null),
            );
            if (hasGrade) grades.set(recent[i].id, result.value);
          }
        });
        setCourseGrades(grades);
      } catch (e) {
        handleApiError(e);
        if (!(e instanceof TokenExpiredError)) {
          setError('Impossible de charger le tableau de bord');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api, userid]);

  // Fetch Panoramix events (wide range for Gantt + calendar)
  useEffect(() => {
    if (!panoramixApi) return;
    const now = new Date();
    const start = subMonths(now, 1);
    const end = addMonths(now, 5);
    panoramixApi
      .getEvents(start.toISOString(), end.toISOString())
      .then((data) => {
        setPanoramixEvents(data);

        // Fetch full details for all events (slots for appointments, descriptions, etc.)
        if (data.length > 0) {
          Promise.allSettled(
            data.map((e) => panoramixApi.getEventDetail(e._id)),
          ).then((results) => {
            const map = new Map<string, PanoramixEventDetail>();
            results.forEach((r, i) => {
              if (r.status === 'fulfilled') map.set(data[i]._id, r.value);
            });
            setEventDetailsMap(map);
          });
        }
      })
      .catch((err) => handleApiError(err));
  }, [panoramixApi]);

  // Build course→color map (same grouping logic as GanttChart) for the calendar
  const courseColorMap = useMemo(() => {
    const filtered = events.filter((e) => e.modulename !== 'feedback' && e.modulename !== 'groupselect');
    const groups = new Map<number, CalendarEvent[]>();
    for (const ev of filtered) {
      const cid = ev.course?.id;
      if (cid == null) continue;
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid)!.push(ev);
    }
    for (const evs of groups.values()) evs.sort((a, b) => a.timesort - b.timesort);

    const nowTs = Math.floor(Date.now() / 1000);
    const sorted = [...groups.entries()]
      .sort(([, a], [, b]) => {
        const nextA = a.find((e) => e.timesort > nowTs)?.timesort ?? a[a.length - 1].timesort;
        const nextB = b.find((e) => e.timesort > nowTs)?.timesort ?? b[b.length - 1].timesort;
        return nextA - nextB;
      })
      .slice(0, 8);

    const map = new Map<number, typeof PROJECT_COLORS[0]>();
    sorted.forEach(([courseId], i) => {
      map.set(courseId, PROJECT_COLORS[i % PROJECT_COLORS.length]);
    });
    return map;
  }, [events]);

  const activeIds = useMemo(
    () => new Set(activeCourses.map((c) => c.id)),
    [activeCourses],
  );

  const sortedRecentCourses = useMemo(
    () => [...recentCourses].sort((a, b) => {
      const aActive = activeIds.has(a.id) ? 1 : 0;
      const bActive = activeIds.has(b.id) ? 1 : 0;
      return bActive - aActive;
    }),
    [recentCourses, activeIds],
  );

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-danger" />
        </div>
        <p className="text-sm text-text-muted dark:text-text-dark-muted mb-4">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
          className="px-4 py-2 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const firstName = user?.fullname.split(' ')[0] ?? 'Étudiant';
  const showPlanning = hasPlanningData(curriculum);

  const semester = events[0]?.course?.coursecategory ?? '';

  return (
    <div className="flex flex-col lg:flex-row">
      {/* ── Left sidebar — projets récents ── */}
      {recentCourses.length > 0 && (
        <aside className="shrink-0 lg:w-64 lg:sticky lg:top-20 lg:self-start lg:h-[calc(100vh-5rem)] lg:overflow-y-auto px-4 lg:pl-4 lg:pr-0 lg:border-r border-border/30 dark:border-border-dark/30 pb-4 lg:pb-0">
          <h2 className="text-sm font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4" />
            Projets récents
          </h2>
          {/* Mobile: horizontal scroll strip — Desktop: vertical list */}
          <div className="flex gap-2 overflow-x-auto lg:block lg:overflow-x-visible lg:space-y-0.5 -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sortedRecentCourses.map((course) => (
              <div key={course.id} className="shrink-0 w-52 lg:w-auto">
                <RecentProjectCard
                  course={course}
                  isActive={activeIds.has(course.id)}
                  gradingResults={courseGrades.get(course.id)}
                />
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-text dark:text-text-dark">
            Bon retour, {firstName} !
          </h1>
          <p className="text-text-muted dark:text-text-dark-muted mt-1 text-sm inline-flex items-center gap-2 flex-wrap">
            {semester && (
              <span className="bg-accent/10 text-accent text-xs font-medium rounded-md px-2 py-0.5">
                {semester}
              </span>
            )}
            {curriculum && (
              <span className="bg-accent/10 text-accent text-xs font-medium rounded-md px-2 py-0.5">
                {curriculum}
              </span>
            )}
          </p>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4" />
            Chronologie
          </h2>
          <p className="text-xs text-text-muted/70 dark:text-text-dark-muted/70 mb-4">
            Vos projets en cours et leurs échéances à venir
          </p>
          <div className="bg-surface dark:bg-surface-dark-dim rounded-2xl shadow-md dark:shadow-none dark:border dark:border-border-dark overflow-hidden">
            <GanttChart events={events} panoramixEvents={panoramixEvents} showPlanning={showPlanning} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider flex items-center gap-2 justify-center mb-4">
            <Calendar className="w-4 h-4" />
            Calendrier
          </h2>
          <DashboardCalendar panoramixEvents={panoramixEvents} courseColorMap={courseColorMap} eventDetailsMap={eventDetailsMap} showPlanning={showPlanning} />
        </section>
      </div>
    </div>
  );
}
