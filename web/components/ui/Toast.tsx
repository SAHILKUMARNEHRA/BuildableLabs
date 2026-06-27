'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastKind, string> = {
  success: '✓',
  error: '!',
  info: 'i',
};

const ACCENTS: Record<ToastKind, string> = {
  success: 'from-emerald-400 to-teal-500',
  error: 'from-rose-400 to-red-500',
  info: 'from-indigo-400 to-violet-500',
};

/**
 * Lightweight toast system. Anything in the tree can call `toast(message, kind)`
 * to surface a glassy notification — used heavily by the auth flow to show the
 * specific error messages (wrong password, already registered, etc.).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex flex-col items-center gap-2.5 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-strong pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-2xl px-4 py-3"
            role="status"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${ACCENTS[t.kind]}`}
            >
              {ICONS[t.kind]}
            </span>
            <p className="text-sm font-medium text-slate-700">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>.');
  return ctx;
}
