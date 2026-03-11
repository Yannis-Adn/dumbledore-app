import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: { label: string; onClick: () => void };
  duration: number; // ms, 0 = persistent
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'> & { duration?: number }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, 'id'> & { duration?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = t.duration ?? 5000;
    setToasts((prev) => [...prev, { ...t, id, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
