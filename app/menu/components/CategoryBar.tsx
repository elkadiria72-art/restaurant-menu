'use client';

import { Search, X } from 'lucide-react';
import type { Category } from '@/lib/types';

type Props = {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (value: string) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCloseSearch: () => void;
  translateCategory: (name: string) => string;
  labels: {
    all: string;
    searchPlaceholder: string;
    cancel: string;
  };
  isRTL: boolean;
};

export default function CategoryBar({
  categories,
  selectedCategory,
  onSelectCategory,
  searchOpen,
  onToggleSearch,
  searchQuery,
  onSearchChange,
  onCloseSearch,
  translateCategory,
  labels,
  isRTL,
}: Props) {
  return (
    <div
      className="sticky top-0 z-30 w-full max-w-[100vw] overflow-x-hidden border-b border-[#EAE4D8] bg-[#FAF7F0]/95 backdrop-blur-md safe-top"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto w-full max-w-7xl px-3 pt-2 pb-2 sm:pt-2.5">
        {/* 5 — Search: discoverable field-style trigger expanding into the input */}
        <div className="flex min-w-0 items-center gap-2">
          {!searchOpen ? (
            <button
              type="button"
              aria-label={labels.searchPlaceholder}
              aria-expanded={false}
              onClick={onToggleSearch}
              className="touch-target flex min-h-11 w-full items-center gap-2.5 rounded-full border border-[#EAE4D8] bg-white px-4 py-2.5 text-right text-sm text-[#87918A] shadow-[0_1px_3px_rgba(38,49,43,0.04)] transition hover:border-[#2F8F4E]/40"
            >
              <Search size={17} className="shrink-0 text-[#2F8F4E]" />
              <span className="min-w-0 flex-1 truncate">{labels.searchPlaceholder}</span>
            </button>
          ) : null}

          <div
            className={`flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-all duration-300 ease-out ${
              searchOpen ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {searchOpen ? (
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#2F8F4E]/45 bg-white px-4 py-2 shadow-[0_1px_3px_rgba(38,49,43,0.04)]">
                <Search size={16} className="shrink-0 text-[#2F8F4E]" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={labels.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#26312B] outline-none placeholder:text-[#A6AFA8]"
                />
                <button
                  type="button"
                  onClick={onCloseSearch}
                  aria-label={labels.cancel}
                  className="touch-target shrink-0 rounded-full p-1 text-[#87918A] transition hover:bg-[#E9F4EC] hover:text-[#26312B]"
                >
                  <X size={16} />
                </button>
              </label>
            ) : null}
          </div>
        </div>

        {/* 6 — Categories: horizontal scroll, green active state */}
        {!searchOpen ? (
          <div className="no-scrollbar mt-2.5 overflow-x-auto overscroll-x-contain pb-1">
            <div className="inline-flex gap-2 pe-2">
              <button
                type="button"
                onClick={() => onSelectCategory('ALL')}
                className={`shrink-0 touch-target whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#2F8F4E] text-white shadow-[0_4px_12px_rgba(47,143,78,0.28)]'
                    : 'border border-[#EAE4D8] bg-white text-[#5A665E] hover:border-[#2F8F4E]/40 hover:text-[#26312B]'
                }`}
              >
                {labels.all}
              </button>

              {categories.map((cat) => {
                const key = String(cat.id);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectCategory(key)}
                    className={`max-w-[11rem] shrink-0 touch-target truncate whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition sm:max-w-none ${
                      selectedCategory === key
                        ? 'bg-[#2F8F4E] text-white shadow-[0_4px_12px_rgba(47,143,78,0.28)]'
                        : 'border border-[#EAE4D8] bg-white text-[#5A665E] hover:border-[#2F8F4E]/40 hover:text-[#26312B]'
                    }`}
                  >
                    {translateCategory(cat.name)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
