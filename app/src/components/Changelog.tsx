import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Newspaper, X, Sparkles, Wrench, Bug, Bell, Palette, LayoutDashboard, FlaskConical, type LucideIcon } from 'lucide-react';

interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  tag: 'new' | 'improvement' | 'fix';
  icon?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  bell: Bell,
  palette: Palette,
  layout: LayoutDashboard,
  flask: FlaskConical,
};

const STORAGE_KEY = 'dumbledore_changelog_last_read';
const POLL_INTERVAL = 60_000;

const TAG_CONFIG = {
  new: { label: 'Feature', icon: Sparkles, color: 'bg-primary/15 text-primary dark:bg-primary-dark/20 dark:text-primary-dark' },
  improvement: { label: 'Amelioration', icon: Wrench, color: 'bg-success/15 text-success' },
  fix: { label: 'Correction', icon: Bug, color: 'bg-warning/15 text-warning' },
};

const DEMO_HIDDEN_IDS: string[] = [];

export default function Changelog({ isDemo = false }: { isDemo?: boolean }) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [lastReadId, setLastReadId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const modalRef = useRef<HTMLDivElement>(null);
  // Snapshot of lastReadId when modal opens — used for styling unread entries while modal is visible
  const lastReadIdOnOpenRef = useRef<string | null>(null);

  const fetchChangelog = useCallback(async () => {
    try {
      const res = await fetch(`/changelog.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      const all: ChangelogEntry[] = data.entries ?? [];
      setEntries(isDemo ? all.filter((e) => !DEMO_HIDDEN_IDS.includes(e.id)) : all);
    } catch {
      // silently fail
    }
  }, []);

  // Fetch on mount + poll
  useEffect(() => {
    fetchChangelog();
    const interval = setInterval(fetchChangelog, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchChangelog]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

  // Count unread
  const unreadCount = (() => {
    if (!lastReadId || entries.length === 0) return entries.length;
    const idx = entries.findIndex((e) => e.id === lastReadId);
    return idx === -1 ? entries.length : idx;
  })();

  const handleOpen = () => {
    lastReadIdOnOpenRef.current = lastReadId;
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    if (entries.length > 0) {
      const latestId = entries[0].id;
      localStorage.setItem(STORAGE_KEY, latestId);
      setLastReadId(latestId);
    }
  };

  const isUnread = (entry: ChangelogEntry) => {
    const ref = open ? lastReadIdOnOpenRef.current : lastReadId;
    if (!ref) return true;
    const readIdx = entries.findIndex((e) => e.id === ref);
    const entryIdx = entries.findIndex((e) => e.id === entry.id);
    return readIdx === -1 || entryIdx < readIdx;
  };

  if (entries.length === 0) return null;

  return (
    <>
      {/* Navbar button */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark transition-colors rounded-xl hover:bg-surface-dim dark:hover:bg-surface-dark"
        title="Updates"
      >
        <Newspaper className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-primary rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Modal — portaled to body to escape header's backdrop-blur containing block */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim shadow-2xl animate-modal-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark shrink-0">
              <div className="flex items-center gap-2.5">
                <Newspaper className="w-5 h-5 text-primary dark:text-primary-dark" />
                <h2 className="text-lg font-semibold text-text dark:text-text-dark">
                  Updates
                </h2>
                {unreadCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary dark:bg-primary-dark/20 dark:text-primary-dark">
                    {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable entries */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {entries.map((entry, i) => {
                const unread = isUnread(entry);
                const prevUnread = i > 0 ? isUnread(entries[i - 1]) : null;
                const showReadSeparator = !unread && prevUnread === true;
                const tag = TAG_CONFIG[entry.tag];
                const TagIcon = tag.icon;
                const EntryIcon = entry.icon ? ICON_MAP[entry.icon] : null;

                return (
                  <div key={entry.id}>
                    {/* Separator between unread and read sections */}
                    {showReadSeparator && (
                      <div className="flex items-center gap-3 pb-4">
                        <div className="flex-1 h-px bg-border dark:bg-border-dark" />
                        <span className="text-[11px] font-medium text-text-muted dark:text-text-dark-muted uppercase tracking-wide">
                          Deja lues
                        </span>
                        <div className="flex-1 h-px bg-border dark:bg-border-dark" />
                      </div>
                    )}
                    <div
                      className={`rounded-xl p-4 transition-colors ${
                        unread
                          ? 'bg-primary/8 dark:bg-primary-dark/10 ring-1 ring-primary/30 dark:ring-primary-dark/25'
                          : 'bg-surface-dim/50 dark:bg-surface-dark/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {unread && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary dark:bg-primary-dark text-white uppercase tracking-wide">
                            New
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${tag.color}`}>
                          <TagIcon className="w-3 h-3" />
                          {tag.label}
                        </span>
                        <span className="text-[11px] text-text-muted dark:text-text-dark-muted">
                          {new Date(entry.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {unread && (
                          <span className="ml-auto w-2.5 h-2.5 rounded-full bg-primary dark:bg-primary-dark shrink-0 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-start gap-3">
                        {EntryIcon && (
                          <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${
                            unread
                              ? 'bg-primary/15 dark:bg-primary-dark/15'
                              : 'bg-primary/10 dark:bg-primary-dark/10'
                          }`}>
                            <EntryIcon className="w-4 h-4 text-primary dark:text-primary-dark" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className={`text-sm font-semibold mb-1 ${
                            unread
                              ? 'text-text dark:text-text-dark'
                              : 'text-text/70 dark:text-text-dark/70'
                          }`}>
                            {entry.title}
                          </h3>
                          <p className={`text-sm leading-relaxed ${
                            unread
                              ? 'text-text-muted dark:text-text-dark-muted'
                              : 'text-text-muted/70 dark:text-text-dark-muted/70'
                          }`}>
                            {entry.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    {i < entries.length - 1 && isUnread(entry) === isUnread(entries[i + 1]) && (
                      <div className="flex justify-center py-1">
                        <div className="w-px h-3 bg-border dark:bg-border-dark" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
