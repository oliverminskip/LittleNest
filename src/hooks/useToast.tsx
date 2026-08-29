import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/format';

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: 'default' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (title: string, body?: string, options?: Partial<Omit<Toast, 'id' | 'title' | 'body'>>) => void;
  success: (title: string, body?: string, action?: Toast['action']) => void;
  error: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nextId.current;
    nextId.current += 1;
    setToasts((previous) => [...previous.slice(-2), { ...toast, id }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: (title, body, options) => push({ title, body, tone: 'default', ...options }),
      success: (title, body, action) => push({ title, body, tone: 'success', action }),
      error: (title, body) => push({ title, body, tone: 'error' }),
    }),
    [push],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[999] flex flex-col items-center gap-2 px-3.5">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, DURATION);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-app animate-rise items-center gap-3 rounded-2xl px-4 py-3.5 text-white shadow-lg',
        toast.tone === 'success' && 'bg-moss-deep',
        toast.tone === 'error' && 'bg-rose',
        toast.tone === 'default' && 'bg-ink',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-black uppercase tracking-wide opacity-70">{toast.title}</p>
        {toast.body ? <p className="truncate text-[14.5px] font-bold">{toast.body}</p> : null}
      </div>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-[13px] font-extrabold"
        >
          {toast.action.label}
        </button>
      ) : (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-60">
          ✕
        </button>
      )}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
