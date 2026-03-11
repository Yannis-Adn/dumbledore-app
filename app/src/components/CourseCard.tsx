import type { Course } from '@/lib/gandalf-api';

interface Props {
  course: Course;
}

export default function CourseCard({ course }: Props) {
  const progress = course.progress ?? 0;
  const projectCode = course.shortname.split('_')[0];
  const displayName = course.fullname.replace(/^T-\w+-\d+\s*-\s*/, '');
  const category = course.coursecategory;

  const progressColor =
    progress === 100
      ? 'bg-success'
      : progress >= 50
        ? 'bg-primary'
        : progress > 0
          ? 'bg-warning'
          : 'bg-border dark:bg-border-dark';

  return (
    <div
      className="group block bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark hover:border-primary/50 hover:shadow-md transition-all overflow-hidden cursor-pointer"
    >
      {/* Image */}
      <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
        {course.courseimage && (
          <img
            src={course.courseimage}
            alt=""
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <div className="absolute top-2 left-2">
          <span className="inline-block px-2 py-0.5 rounded-md bg-surface/90 dark:bg-surface-dark/90 text-xs font-medium text-text dark:text-text-dark backdrop-blur-sm">
            {category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs font-mono text-text-muted dark:text-text-dark-muted mb-1">
          {projectCode}
        </p>
        <h3 className="font-semibold text-text dark:text-text-dark text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {displayName}
        </h3>

        {/* Progress bar */}
        {course.hasprogress && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-text-muted dark:text-text-dark-muted">Progress</span>
              <span className="text-xs font-medium text-text dark:text-text-dark">
                {progress}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-dim dark:bg-surface-dark overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
