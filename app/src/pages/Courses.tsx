import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth';
import { Link } from 'react-router-dom';
import type { Course, CourseClassification } from '@/lib/gandalf-api';
import CourseCard from '@/components/CourseCard';
import { TokenExpiredError } from '@/lib/errors';
import PageLoader from '@/components/PageLoader';
import {
  Loader2,
  BookOpen,
  Search,
  Star,
  Clock,
  Archive,
  CalendarClock,
  LayoutGrid,
  AlertCircle,
} from 'lucide-react';

const TABS: { label: string; value: CourseClassification; icon: typeof BookOpen }[] = [
  { label: 'En cours', value: 'inprogress', icon: Clock },
  { label: 'Tous', value: 'all', icon: LayoutGrid },
  { label: 'Favoris', value: 'favourites', icon: Star },
  { label: 'Passés', value: 'past', icon: Archive },
  { label: 'À venir', value: 'future', icon: CalendarClock },
];

export default function Courses() {
  const { api, handleApiError } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CourseClassification>('inprogress');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Course[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    api.getCourses(tab, 50).then((res) => {
      if (!cancelled) {
        setCourses(res.courses);
        setLoading(false);
      }
    }).catch((e) => {
      handleApiError(e);
      if (!cancelled) {
        if (!(e instanceof TokenExpiredError)) setError('Impossible de charger les cours');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [api, tab]);

  useEffect(() => {
    if (!api || !search.trim()) {
      return;
    }
    const timeout = setTimeout(() => {
      setSearching(true);
      api.searchCourses(search.trim()).then((res) => {
        setSearchResults(res.courses as unknown as Course[]);
        setSearching(false);
      }).catch((e) => { handleApiError(e); setSearching(false); });
    }, 300);
    return () => clearTimeout(timeout);
  }, [api, search]);

  const handleTabChange = (newTab: CourseClassification) => {
    setTab(newTab);
    setLoading(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (!value.trim()) setSearchResults(null);
  };

  const displayed = searchResults ?? courses;

  const grouped = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const c of displayed) {
      const cat = c.coursecategory || 'Autre';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [displayed]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text dark:text-text-dark">
            Mes cours
          </h1>
          <p className="text-text-muted dark:text-text-dark-muted mt-1 text-sm">
            {displayed.length} cours
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted dark:text-text-dark-muted" />
          <input
            type="text"
            placeholder="Rechercher un cours..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface dark:bg-surface-dark-dim border border-border dark:border-border-dark text-sm text-text dark:text-text-dark placeholder:text-text-muted/50 dark:placeholder:text-text-dark-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
          )}
        </div>
      </div>

      {/* Tabs */}
      {!searchResults && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(({ label, value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleTabChange(value)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === value
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface dark:hover:bg-surface-dark-dim'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <PageLoader className="flex items-center justify-center min-h-[40vh]" />
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-danger" />
          </div>
          <p className="text-sm text-text-muted dark:text-text-dark-muted mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); }}
            className="px-4 py-2 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-text-muted dark:text-text-dark-muted">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Aucun cours trouvé</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, categoryCourses]) => (
            <section key={category}>
              <h2 className="text-sm font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider mb-3">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryCourses.map((course) => (
                  <Link key={course.id} to={`/course/${course.id}`} className="block">
                    <CourseCard course={course} />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
