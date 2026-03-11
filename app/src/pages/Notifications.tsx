import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth';
import type { Notification } from '@/lib/gandalf-api';
import { format, fromUnixTime, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TokenExpiredError } from '@/lib/errors';
import PageLoader from '@/components/PageLoader';
import {
  Loader2,
  Bell,
  BellOff,
  ExternalLink,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

export default function Notifications() {
  const { api, userid, handleApiError } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!api || !userid) return;

    api.getNotifications(userid, PAGE_SIZE, 0).then((res) => {
      setNotifications(res.notifications);
      setUnreadCount(res.unreadcount);
      setHasMore(res.notifications.length >= PAGE_SIZE);
      setOffset(PAGE_SIZE);
      setLoading(false);
    }).catch((e) => {
      handleApiError(e);
      if (!(e instanceof TokenExpiredError)) setError('Impossible de charger les notifications');
      setLoading(false);
    });
  }, [api, userid]);

  const loadMore = async () => {
    if (!api || !userid || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.getNotifications(userid, PAGE_SIZE, offset);
      setNotifications((prev) => [...prev, ...res.notifications]);
      setHasMore(res.notifications.length >= PAGE_SIZE);
      setOffset((prev) => prev + PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text dark:text-text-dark flex items-center gap-3">
          Notifications
          {unreadCount > 0 && (
            <span className="bg-danger text-white text-xs font-bold rounded-full px-2.5 py-1">
              {unreadCount}
            </span>
          )}
        </h1>
        <p className="text-text-muted dark:text-text-dark-muted mt-1 text-sm">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error ? (
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
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-text-muted dark:text-text-dark-muted">
          <BellOff className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <NotificationRow key={notif.id} notif={notif} />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Charger plus
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notif }: { notif: Notification }) {
  const date = fromUnixTime(notif.timecreated);
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: fr });
  const formatted = format(date, 'd MMM yyyy, HH:mm', { locale: fr });
  const isUnread = !notif.read;

  const content = (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
        isUnread
          ? 'bg-primary/5 border-primary/20 dark:bg-primary/5 dark:border-primary/20'
          : 'bg-surface dark:bg-surface-dark-dim border-border dark:border-border-dark'
      } hover:shadow-md`}
    >
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
        isUnread ? 'bg-primary/10' : 'bg-surface-dim dark:bg-surface-dark'
      }`}>
        <Bell className={`w-5 h-5 ${isUnread ? 'text-primary' : 'text-text-muted dark:text-text-dark-muted'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${
            isUnread
              ? 'font-semibold text-text dark:text-text-dark'
              : 'text-text dark:text-text-dark'
          }`}>
            {notif.subject || notif.shortenedsubject}
          </p>
          {notif.contexturl && (
            <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-text-muted/30 dark:text-text-dark-muted/30" />
          )}
        </div>
        {notif.smallmessage && notif.smallmessage !== notif.subject && (
          <p className="text-xs text-text-muted dark:text-text-dark-muted mt-1 line-clamp-2">
            {notif.smallmessage}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-text-muted dark:text-text-dark-muted">
            {relative}
          </span>
          <span className="text-[11px] text-text-muted/50 dark:text-text-dark-muted/50">
            {formatted}
          </span>
        </div>
      </div>
    </div>
  );

  return notif.contexturl ? (
    <a href={notif.contexturl} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}
