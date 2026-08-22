'use client';

type Props = {
  message: string;
  variant?: 'info' | 'success' | 'error';
};

const styles = {
  info: 'bg-white text-[#292521] border-[#E7DCC8]',
  success: 'bg-[#EDF4ED] text-[#3E7242] border-[#CFE2CF]',
  error: 'bg-[#F9ECEA] text-[#B84A3A] border-[#EAC8C2]',
};

export default function NotificationToast({ message, variant = 'info' }: Props) {
  if (!message) return null;

  return (
    <div
      className={`fixed left-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-center text-sm font-medium shadow-[0_8px_24px_rgba(41,37,33,0.12)] ${styles[variant]}`}
      style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
