import { useToastStore } from '../../store/toastStore';

const styles = {
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  error: 'border-red-500/40 bg-red-500/15 text-red-200',
  info: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[100] flex flex-col gap-2 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto animate-fade-in-up max-w-sm rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-xl ${styles[t.type]}`}
          onClick={() => dismiss(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
