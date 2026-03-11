import type { CalendarEvent } from '@/lib/gandalf-api';
import { format, formatDistanceToNow, fromUnixTime } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';

interface Props {
  event: CalendarEvent;
}

export default function DeadlineCard({ event }: Props) {
  const date = fromUnixTime(event.timesort);
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: fr });
  const formatted = format(date, 'd MMM, HH:mm', { locale: fr });
  const courseCode = event.course?.shortname?.split('_')[0] ?? '';

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-3.5 rounded-2xl transition-all hover:shadow-md bg-surface dark:bg-surface-dark-dim shadow-sm dark:shadow-none dark:border dark:border-border-dark"
    >
      <span
        className={`shrink-0 w-2.5 h-2.5 rounded-full ${
          event.overdue ? 'bg-danger shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-primary shadow-[0_0_6px_rgba(99,102,241,0.4)]'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text dark:text-text-dark truncate group-hover:text-primary transition-colors">
          {event.activityname || event.name}
        </p>
        <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
          <span className="font-mono">{courseCode}</span>
          <span className="mx-1.5 opacity-30">|</span>
          <span className={event.overdue ? 'text-danger font-medium' : ''}>
            {relative}
          </span>
          <span className="mx-1.5 opacity-30">|</span>
          <span>{formatted}</span>
        </p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-text-muted/0 group-hover:text-text-muted dark:group-hover:text-text-dark-muted transition-colors" />
    </a>
  );
}
