'use client';

import { Bell, MapPin } from 'lucide-react';
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
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 1 — Restaurant identity (typographic, no logo asset) */}
      <div className="pt-1 text-center">
        <p
          className={`text-[11px] font-bold uppercase text-[#2F8F4E] ${
            isRTL ? 'tracking-normal' : 'tracking-[0.32em]'
          }`}
        >
          {labels.title}
        </p>
        <h1 className="font-display mt-1.5 text-[27px] font-bold leading-tight text-[#26312B] sm:text-4xl">
          {labels.brand}
        </h1>
        <div className="mt-3 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-10 bg-[#D8E6DC] sm:w-14" />
          <span className="h-1.5 w-1.5 rotate-45 bg-[#2F8F4E]/60" />
          <span className="h-px w-10 bg-[#D8E6DC] sm:w-14" />
        </div>
      </div>

      {/* 2 — Table indicator (compact, secondary to identity) */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3ECDF] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#41504A] shadow-[0_1px_2px_rgba(38,49,43,0.04)]">
          <MapPin size={13} className="shrink-0 text-[#2F8F4E]" />
          {labels.tableLabel} {tableNumber}
        </span>
      </div>

      {/* 3 — Waiter request (clearly actionable) · 4 — Language selector (compact) */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onCallWaiter}
          aria-label={labels.callWaiter}
          className="touch-target order-first inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#2F8F4E] px-4 py-2 text-[13px] font-bold text-white shadow-[0_6px_16px_rgba(47,143,78,0.25)] transition hover:bg-[#25763E] active:scale-[0.98]"
        >
          <Bell size={15} className="shrink-0" />
          <span className="truncate">{labels.callWaiter}</span>
        </button>

        <div className="no-scrollbar flex min-w-0 items-center gap-1.5">
          {(['en', 'fr', 'ar'] as Language[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onLanguageChange(code)}
              className={`shrink-0 touch-target rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                language === code
                  ? 'bg-[#E9F4EC] text-[#1F6B3B] ring-1 ring-[#2F8F4E]/30'
                  : 'border border-[#EAE4D8] bg-white text-[#5A665E] hover:border-[#2F8F4E]/40 hover:text-[#26312B]'
              }`}
            >
              {labels.languageOptions[code]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
