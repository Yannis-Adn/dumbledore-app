import type { CalendarEvent } from '@/lib/gandalf-api';
import { format, formatDistanceToNow, fromUnixTime } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, AlertTriangle, ExternalLink } from 'lucide-react';

interface Props {
  event: CalendarEvent;
}

export default function EventCard({ event }: Props) {
  const date = fromUnixTime(event.timesort);
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: fr });
  const formatted = format(date, 'd MMM yyyy, HH:mm', { locale: fr });
  const courseName = event.course?.fullname?.replace(/^T-\w+-\d+\s*-\s*/, '') ?? '';
  const courseCode = event.course?.shortname?.split('_')[0] ?? '';

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
        event.overdue
          ? 'bg-danger/5 border-danger/20 hover:border-danger/40'
          : 'bg-surface dark:bg-surface-dark-dim border-border dark:border-border-dark hover:border-primary/50'
      }`}
    >
      {/* Icon */}
      <div
        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          event.overdue ? 'bg-danger/10' : 'bg-primary/10'
        }`}
      >
        {event.overdue ? (
          <AlertTriangle className="w-5 h-5 text-danger" />
        ) : (
          <Clock className="w-5 h-5 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-sm text-text dark:text-text-dark group-hover:text-primary transition-colors">
              {event.activityname || event.name}
            </h3>
            <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
              <span className="font-mono">{courseCode}</span>
              {courseName && ` - ${courseName}`}
            </p>
          </div>
          <ExternalLink className="w-4 h-4 shrink-0 text-text-muted/0 group-hover:text-text-muted dark:group-hover:text-text-dark-muted transition-colors" />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span
            className={`text-xs font-medium ${
              event.overdue ? 'text-danger' : 'text-text-muted dark:text-text-dark-muted'
            }`}
          >
            {relative}
          </span>
          <span className="text-xs text-text-muted/50 dark:text-text-dark-muted/50">
            {formatted}
          </span>
          {event.action && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
              {event.action.name}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
