import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  className?: string;
  size?: 'sm' | 'md';
  fullScreen?: boolean;
}

export default function PageLoader({ className, size = 'md', fullScreen = false }: PageLoaderProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';

  const wrapperClass = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-surface-dim dark:bg-surface-dark'
    : className ?? 'flex items-center justify-center min-h-[60vh]';

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={`${iconSize} animate-spin text-primary`} />
        <p
          className={`text-xs text-text-muted dark:text-text-dark-muted text-center max-w-64 transition-opacity duration-500 ${showHint ? 'opacity-100' : 'opacity-0'}`}
        >
          Si le chargement prend du temps, essayez de vous reconnecter sur Gandalf / Panoramix puis relancez votre session.
        </p>
      </div>
    </div>
  );
}
