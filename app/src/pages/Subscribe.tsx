import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bell, Check, Copy, ExternalLink, Smartphone } from 'lucide-react';

export default function Subscribe() {
  const { topicId } = useParams<{ topicId: string }>();
  const [copied, setCopied] = useState(false);

  if (!topicId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dim dark:bg-surface-dark p-4">
        <p className="text-text-muted dark:text-text-dark-muted">Lien invalide.</p>
      </div>
    );
  }

  const handleOpenApp = () => {
    window.location.href = `ntfy://ntfy.sh/${topicId}`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(topicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dim dark:bg-surface-dark p-4">
      <div className="max-w-sm w-full space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-3">
            <Bell className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-text dark:text-text-dark">
            Dumbledore Notifications
          </h1>
          <p className="text-sm text-text-muted dark:text-text-dark-muted mt-1">
            Abonne-toi pour recevoir tes rappels
          </p>
        </div>

        {/* Open in ntfy app */}
        <button
          onClick={handleOpenApp}
          className="w-full py-3 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          Ouvrir dans ntfy
        </button>

        {/* Topic code */}
        <div className="p-4 rounded-xl bg-surface dark:bg-surface-dark-dim border border-border dark:border-border-dark">
          <p className="text-xs text-text-muted dark:text-text-dark-muted mb-2">
            Ou copie ce code et ajoute-le manuellement dans ntfy (bouton "+")
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-surface-dim dark:bg-surface-dark text-xs font-mono text-text dark:text-text-dark truncate">
              {topicId}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark transition-colors rounded-lg"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* App store links */}
        <div className="p-4 rounded-xl bg-surface dark:bg-surface-dark-dim border border-border dark:border-border-dark">
          <p className="text-xs text-text-muted dark:text-text-dark-muted mb-3">
            Pas encore l'app ntfy ?
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="https://apps.apple.com/app/ntfy/id1625396347"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-surface-dim dark:bg-surface-dark text-text dark:text-text-dark text-sm font-medium hover:bg-border dark:hover:bg-border-dark transition-colors"
            >
              App Store
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=io.heckel.ntfy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-surface-dim dark:bg-surface-dark text-text dark:text-text-dark text-sm font-medium hover:bg-border dark:hover:bg-border-dark transition-colors"
            >
              Google Play
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
