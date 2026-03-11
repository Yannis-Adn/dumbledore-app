import { useToast, type ToastType } from '@/context/toast';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ICONS: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

const STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  error: {
    bg: 'bg-danger/10',
    border: 'border-danger/30',
    icon: 'text-danger',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    icon: 'text-warning',
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/30',
    icon: 'text-success',
  },
  info: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    icon: 'text-primary',
  },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        const style = STYLES[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm ${style.bg} ${style.border} bg-surface/95 dark:bg-surface-dark-dim/95 animate-[slideIn_0.2s_ease-out]`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.icon}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text dark:text-text-dark">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    removeToast(toast.id);
                  }}
                  className="mt-1.5 text-xs font-medium text-primary hover:text-primary-dark dark:text-primary-dark dark:hover:text-primary transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark transition-colors rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
