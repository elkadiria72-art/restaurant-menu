'use client';

import { Bell, Sparkles } from 'lucide-react';
import type { Language } from '@/lib/types';

type Props = {
  language: Language;
  tableNumber: number;
  onLanguageChange: (code: Language) => void;
  onCallWaiter: () => void;
  labels: {
    brand: string;
    title: string;
    callWaiter: string;
    tableLabel: string;
    languageOptions: Record<Language, string>;
  };
  isRTL: boolean;
};

export default function MenuHeader({
  language,
  tableNumber,
  onLanguageChange,
  onCallWaiter,
  labels,
  isRTL,
}: Props) {
  return (
    <div className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#2f8f4a] text-lg font-bold text-white sm:h-12 sm:w-12">
            O
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2f8f4a] sm:text-xs sm:tracking-[0.22em]">
              <Sparkles size={12} className="shrink-0" />
              <span className="truncate">{labels.brand}</span>
            </div>
            <h1 className="truncate text-base font-semibold text-[#2f2417] sm:text-xl">{labels.title}</h1>
            <p className="mt-0.5 text-xs text-[#7a6140]">
              {labels.tableLabel} {tableNumber}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCallWaiter}
          aria-label={labels.callWaiter}
          className="touch-target flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#2f8f4a] px-4 py-2.5 text-sm font-semibold text-white sm:w-auto sm:py-2"
        >
          <Bell size={16} className="shrink-0" />
          <span className="truncate">{labels.callWaiter}</span>
        </button>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5">
        {(['en', 'fr', 'ar'] as Language[]).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onLanguageChange(code)}
            className={`shrink-0 touch-target rounded-full px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
              language === code
                ? 'bg-[#2f8f4a] text-white'
                : 'border border-[#e9dfbf] bg-white/90 text-[#2f2417]'
            }`}
          >
            {labels.languageOptions[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
