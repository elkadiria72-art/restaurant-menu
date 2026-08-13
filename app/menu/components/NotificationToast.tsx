'use client';

type Props = {
  message: string;
  variant?: 'info' | 'success' | 'error';
};

const styles = {
  info: 'bg-[#2f2417] text-white',
  success: 'bg-[#2f8f4a] text-white',
  error: 'bg-[#8b3a3a] text-white',
};

export default function NotificationToast({ message, variant = 'info' }: Props) {
  if (!message) return null;

  return (
    <div
      className={`fixed left-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm font-medium shadow-lg ${styles[variant]}`}
      style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
