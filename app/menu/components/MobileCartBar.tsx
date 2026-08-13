'use client';

import { ChevronUp, ShoppingBag } from 'lucide-react';

type Props = {
  itemCount: number;
  total: number;
  onOpen: () => void;
  labels: {
    items: string;
    viewCart: string;
  };
  isRTL: boolean;
  visible: boolean;
};

export default function MobileCartBar({ itemCount, total, onOpen, labels, isRTL, visible }: Props) {
  if (!visible || itemCount === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 safe-bottom lg:hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto flex w-full touch-target items-center justify-between gap-3 rounded-full border border-[#b08b4d]/35 bg-[#2f2417] px-4 py-3 text-white shadow-[0_20px_60px_-18px_rgba(25,17,10,0.85)] active:scale-[0.99] transition-transform"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0 rounded-full bg-white/10 p-2">
            <ShoppingBag size={16} />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C9A227] px-1 text-[10px] font-bold text-[#22170e]">
              {itemCount}
            </span>
          </div>
          <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="truncate text-sm font-semibold">
              {itemCount} {labels.items}
            </p>
            <p className="text-xs text-stone-300">{total.toFixed(2)} DH</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
          {labels.viewCart}
          <ChevronUp size={16} />
        </span>
      </button>
    </div>
  );
}
