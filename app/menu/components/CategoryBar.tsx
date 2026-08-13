'use client';

import { Search } from 'lucide-react';
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
      className="sticky top-0 z-30 w-full max-w-[100vw] overflow-x-hidden border-b border-[#b08b4d]/15 bg-[#fffaf3]/95 backdrop-blur-md safe-top"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto w-full max-w-7xl px-3 pt-2 pb-2 sm:pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={labels.searchPlaceholder}
            aria-expanded={searchOpen}
            onClick={onToggleSearch}
            className="touch-target shrink-0 rounded-full border border-[#b08b4d]/20 bg-white p-2.5 shadow-sm"
          >
            <Search size={18} className="text-[#2f2417]" />
          </button>

          {searchOpen ? (
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#b08b4d]/30 bg-white px-3 py-2 shadow-sm">
              <Search size={16} className="shrink-0 text-[#9a6c29]" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={labels.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#2f2417] outline-none placeholder:text-[#9d8b6a]"
              />
              <button
                type="button"
                onClick={onCloseSearch}
                className="shrink-0 touch-target px-1 text-xs font-medium text-[#7a6140]"
              >
                {labels.cancel}
              </button>
            </label>
          ) : null}
        </div>

        {!searchOpen ? (
          <div className="no-scrollbar mt-2.5 overflow-x-auto overscroll-x-contain pb-1">
            <div className="inline-flex gap-2 pe-2">
              <button
                type="button"
                onClick={() => onSelectCategory('ALL')}
                className={`shrink-0 touch-target whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#C9A227] text-[#22170e] shadow-sm'
                    : 'border border-[#e9dfbf] bg-white/90 text-[#5b4325]'
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
                    className={`max-w-[11rem] shrink-0 touch-target truncate whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition sm:max-w-none ${
                      selectedCategory === key
                        ? 'bg-[#C9A227] text-[#22170e] shadow-sm'
                        : 'border border-[#e9dfbf] bg-white/90 text-[#5b4325]'
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
