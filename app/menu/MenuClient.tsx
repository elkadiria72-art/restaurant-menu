'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { translateTextClient } from '@/lib/translateClient';
import { clearTableSession, getTokenFromUrl, redirectToCanonicalMenu, saveTableSession, urlTokenMatchesTable } from '@/lib/tableSession';
import { useMenuRealtime } from '@/lib/hooks/useMenuRealtime';
import { itemMatchesCategory } from '@/lib/menuData';
import { playNotificationSound } from '@/lib/notifications';
import type { CartItem, Category, Language, MenuItem, TableSession, WaiterRequestType } from '@/lib/types';
import Cart from './components/Cart';
import CategoryBar from './components/CategoryBar';
import MenuHeader from './components/MenuHeader';
import MenuItemImage from './components/MenuItemImage';
import MobileCartBar from './components/MobileCartBar';
import NotificationToast from './components/NotificationToast';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import ar from '@/locales/ar.json';

const translations = { en, fr, ar };

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ')
    .trim();

const ORDER_STATUS_MESSAGES: Record<Language, Record<string, string>> = {
  en: {
    preparing: 'Your order is being prepared.',
    ready: 'Your order is ready!',
    served: 'Your order has been served. Enjoy!',
    cancelled: 'Your order was cancelled. Please contact staff.',
  },
  fr: {
    preparing: 'Votre commande est en préparation.',
    ready: 'Votre commande est prête !',
    served: 'Votre commande a été servie. Bon appétit !',
    cancelled: 'Votre commande a été annulée. Contactez le personnel.',
  },
  ar: {
    preparing: 'يتم تحضير طلبك.',
    ready: 'طلبك جاهز!',
    served: 'تم تقديم طلبك. بالهناء والشفاء!',
    cancelled: 'تم إلغاء طلبك. يرجى التواصل مع النادل.',
  },
};

type Props = {
  table: TableSession;
};

export default function MenuClient({ table }: Props) {
  const [language, setLanguage] = useState<Language>('ar');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [waiterModalOpen, setWaiterModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'info' | 'success' | 'error' } | null>(null);
  const [submittingWaiterCall, setSubmittingWaiterCall] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchOpen, setSearchOpen] = useState(false);
  const [translationsCache, setTranslationsCache] = useState<Record<string, string>>({});
  const [tableStatus, setTableStatus] = useState<string | null>(table.status ?? null);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const waiterCallInFlight = useRef(false);

  const t = translations[language];
  const isRTL = language === 'ar';
  const searchQueryNormalized = normalize(searchQuery);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const showToast = useCallback((message: string, variant: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, variant });
  }, []);

  useEffect(() => {
    if (!urlTokenMatchesTable(table)) {
      clearTableSession();
      redirectToCanonicalMenu(getTokenFromUrl());
      return;
    }
    saveTableSession(table);
  }, [table]);

  useEffect(() => {
    const guardUrlToken = () => {
      const urlToken = getTokenFromUrl();
      if (!urlToken || urlToken !== table.qr_token) {
        clearTableSession();
        redirectToCanonicalMenu(urlToken);
      }
    };

    guardUrlToken();
    window.addEventListener('popstate', guardUrlToken);
    return () => window.removeEventListener('popstate', guardUrlToken);
  }, [table.qr_token]);

  useEffect(() => {
    const revalidateTable = async () => {
      const urlToken = getTokenFromUrl();
      if (!urlToken || urlToken !== table.qr_token) return;

      try {
        const res = await fetch(`/api/table?token=${encodeURIComponent(urlToken)}`, { cache: 'no-store' });
        if (!res.ok) {
          clearTableSession();
          redirectToCanonicalMenu(urlToken);
          return;
        }
        const data = (await res.json()) as TableSession & { status?: string | null };
        if (data.qr_token !== table.qr_token || data.table_id !== table.table_id) {
          clearTableSession();
          redirectToCanonicalMenu(urlToken);
          return;
        }
        if (data.status != null) setTableStatus(data.status);
      } catch {
        // network blip — keep current session
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void revalidateTable();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [table.qr_token, table.table_id]);

  const resolveQrToken = useCallback(() => {
    const urlToken = getTokenFromUrl();
    if (!urlToken || urlToken !== table.qr_token) {
      throw new Error('TABLE_TOKEN_MISMATCH');
    }
    return urlToken;
  }, [table.qr_token]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.body.style.overflow = cartOpen || waiterModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [cartOpen, waiterModalOpen]);

  const translateText = useCallback(
    (text: string | undefined | null, target: Language) => {
      if (!text) return '';
      const cacheKey = `${text}:::${target}`;
      if (translationsCache[cacheKey]) return translationsCache[cacheKey];
      return text;
    },
    [translationsCache],
  );

  const translateCategory = (name: string) => translateText(name, language);
  const translateItemName = (item: MenuItem) => translateText(item.name, language);
  const translateItemDescription = (item: MenuItem) => translateText(item.description || item.name, language);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      if (!res.ok) return;
      const cats = (await res.json()) as Category[];
      setCategories((cats || []).filter((c) => c?.name));
    } catch {
      // ignore
    }
  }, []);

  const loadMenu = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
      setMessage('');
    }

    try {
      const res = await fetch('/api/menu-items', { cache: 'no-store' });
      if (!res.ok) {
        setMenuItems([]);
        if (!options?.silent) setMessage(t.loadError);
        return;
      }

      const data = (await res.json()) as MenuItem[];
      setMenuItems(data);

      setCart((prev) => {
        if (!prev.length) return prev;
        const availableIds = new Set(
          data.filter((item) => item.is_available !== false).map((item) => item.id),
        );
        return prev.filter((entry) => availableIds.has(entry.id));
      });
    } catch {
      setMenuItems([]);
      if (!options?.silent) setMessage(t.loadError);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    loadMenu();
    loadCategories();
  }, [loadMenu, loadCategories]);

  useMenuRealtime({
    tableId: table.table_id,
    onMenuItemsChange: () => void loadMenu({ silent: true }),
    onCategoriesChange: loadCategories,
    onTableStatusChange: (status) => {
      setTableStatus(status);
      if (status === 'inactive' || status === 'closed') {
        showToast(
          language === 'ar'
            ? 'الطاولة غير متاحة حالياً'
            : language === 'fr'
              ? 'Cette table n\'est pas disponible'
              : 'This table is currently unavailable',
          'error',
        );
      }
    },
    onOrderStatusChange: ({ orderId, status }) => {
      if (lastOrderId && orderId !== lastOrderId) return;
      const statusMessage = ORDER_STATUS_MESSAGES[language][status];
      if (!statusMessage) return;
      showToast(statusMessage, status === 'cancelled' ? 'error' : 'success');
      void playNotificationSound(status === 'cancelled' ? 'alert' : 'success');
    },
    onWaiterCallAcknowledged: ({ status }) => {
      if (status === 'acknowledged' || status === 'completed') {
        showToast(
          language === 'ar'
            ? 'النادل في الطريق إليك'
            : language === 'fr'
              ? 'Le serveur arrive'
              : 'The waiter is on the way',
          'success',
        );
        void playNotificationSound('success');
      }
    },
  });

  useEffect(() => {
    let mounted = true;
    const toTranslate = new Set<string>();

    categories.forEach((cat) => {
      const cacheKey = `${cat.name}:::${language}`;
      if (!translationsCache[cacheKey]) toTranslate.add(cat.name);
    });

    menuItems.forEach((item) => {
      if (item.name) {
        const cacheKey = `${item.name}:::${language}`;
        if (!translationsCache[cacheKey]) toTranslate.add(item.name);
      }
      const desc = item.description || item.name;
      if (desc) {
        const cacheKey = `${desc}:::${language}`;
        if (!translationsCache[cacheKey]) toTranslate.add(desc);
      }
    });

    const fetchTranslations = async () => {
      for (const text of Array.from(toTranslate)) {
        try {
          const translated = await translateTextClient(text, language);
          if (!mounted) return;
          setTranslationsCache((prev) => ({ ...prev, [`${text}:::${language}`]: translated }));
        } catch {
          // ignore per-item failures
        }
      }
    };

    if (toTranslate.size) fetchTranslations();
    return () => {
      mounted = false;
    };
  }, [language, menuItems, categories, translationsCache]);

  const visibleCategories = useMemo(
    () => categories.filter((cat) => menuItems.some((item) => itemMatchesCategory(item, cat))),
    [categories, menuItems],
  );

  useEffect(() => {
    if (selectedCategory === 'ALL') return;
    if (!visibleCategories.some((cat) => String(cat.id) === selectedCategory)) {
      setSelectedCategory('ALL');
    }
  }, [selectedCategory, visibleCategories]);

  const filteredItems = useMemo(() => {
    const items = menuItems.slice();

    if (searchQueryNormalized) {
      return items.filter((item) => {
        const translatedName = translateItemName(item);
        const translatedDescription = translateItemDescription(item);
        const translatedCategory = translateCategory(item.category || '');

        return [translatedName, translatedDescription, translatedCategory, item.name, item.description ?? ''].some(
          (value) => value && normalize(String(value)).includes(searchQueryNormalized),
        );
      });
    }

    if (selectedCategory !== 'ALL') {
      const cat = visibleCategories.find((c) => String(c.id) === selectedCategory);
      if (cat) {
        return items.filter((item) => itemMatchesCategory(item, cat));
      }
    }

    return items;
  }, [menuItems, selectedCategory, visibleCategories, searchQueryNormalized, language, translationsCache]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
      const matchedCategory = visibleCategories.find((cat) => itemMatchesCategory(item, cat));
      const categoryLabel = matchedCategory
        ? translateCategory(matchedCategory.name)
        : item.category
          ? translateCategory(item.category)
          : '';
      if (!categoryLabel) return acc;
      acc[categoryLabel] = acc[categoryLabel] ? [...acc[categoryLabel], item] : [item];
      return acc;
    }, {});
  }, [filteredItems, visibleCategories, language, translationsCache]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) => (entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }
      return [...prev, { id: item.id, name: translateItemName(item), price: item.price, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev.flatMap((entry) => {
        if (entry.id !== id) return [entry];
        const nextQuantity = entry.quantity + delta;
        return nextQuantity > 0 ? [{ ...entry, quantity: nextQuantity }] : [];
      }),
    );
  };

  const handlePlaceOrder = async () => {
    if (!cart.length) {
      setMessage(t.emptyCart);
      return;
    }

    if (tableStatus === 'inactive' || tableStatus === 'closed') {
      showToast(
        language === 'ar' ? 'الطاولة غير متاحة للطلب' : language === 'fr' ? 'Table indisponible' : 'Table unavailable',
        'error',
      );
      return;
    }

    setPlacingOrder(true);
    setMessage('');

    try {
      const qrToken = resolveQrToken();
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: qrToken,
          items: cart.map((item) => ({ item_id: item.id, quantity: item.quantity })),
          ...(orderNotes.trim() ? { notes: orderNotes.trim() } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          clearTableSession();
          redirectToCanonicalMenu(qrToken);
          return;
        }
        setMessage(t.orderError);
        showToast(t.orderError, 'error');
      } else {
        setCart([]);
        setOrderNotes('');
        setCartOpen(false);
        setMessage(t.orderSuccess);
        showToast(t.orderSuccess, 'success');
        void playNotificationSound('success');
        if (data.order_id) setLastOrderId(data.order_id);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'TABLE_TOKEN_MISMATCH') {
        clearTableSession();
        redirectToCanonicalMenu(getTokenFromUrl());
        return;
      }
      setMessage(t.orderError);
      showToast(t.orderError, 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleWaiterCall = async (requestType: WaiterRequestType) => {
    if (waiterCallInFlight.current) return;
    waiterCallInFlight.current = true;
    setSubmittingWaiterCall(true);

    try {
      const qrToken = resolveQrToken();
      const res = await fetch('/api/waiter-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: qrToken,
          request_type: requestType,
          language,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          clearTableSession();
          redirectToCanonicalMenu(qrToken);
          return;
        }
        showToast(t.callError, 'error');
      } else {
        showToast(t.callSent, 'success');
        void playNotificationSound('success');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'TABLE_TOKEN_MISMATCH') {
        clearTableSession();
        redirectToCanonicalMenu(getTokenFromUrl());
        return;
      }
      showToast(t.callError, 'error');
    } finally {
      waiterCallInFlight.current = false;
      setSubmittingWaiterCall(false);
      setWaiterModalOpen(false);
    }
  };

  const categoryLabels = {
    all: t.allCategory,
    searchPlaceholder: t.searchPlaceholder,
    cancel: t.cancel,
  };

  const tableBlocked = tableStatus === 'inactive' || tableStatus === 'closed';

  return (
    <main
      className={`min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden ${isRTL ? 'rtl' : 'ltr'} ${
        cartItemsCount > 0 && !cartOpen ? 'mobile-page-bottom' : 'pb-4'
      } lg:pb-0`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CategoryBar
        categories={visibleCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen((prev) => !prev)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCloseSearch={() => {
          setSearchOpen(false);
          setSearchQuery('');
        }}
        translateCategory={translateCategory}
        labels={categoryLabels}
        isRTL={isRTL}
      />

      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 p-3 sm:gap-6 sm:p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:p-8">
        <section className="min-w-0">
          <div className="space-y-5 sm:space-y-6">
            <MenuHeader
              language={language}
              tableNumber={table.table_number}
              onLanguageChange={setLanguage}
              onCallWaiter={() => setWaiterModalOpen(true)}
              labels={{
                brand: t.brand,
                title: t.title,
                callWaiter: t.callWaiter,
                tableLabel: t.tableLabel,
                languageOptions: t.languageOptions,
              }}
              isRTL={isRTL}
            />

            <p className="mx-auto max-w-md text-center text-[13px] leading-6 text-[#5A665E]">{t.subtitle}</p>

            {tableBlocked ? (
              <div className="rounded-xl border border-[#EFE0C8] bg-[#FBF4E4] p-3 text-center text-sm text-[#8A6A1F]">{t.tableUnavailable}</div>
            ) : null}

            {loading ? (
              <div className="animate-pulse py-16 text-center text-sm text-[#87918A]">{t.loading}</div>
            ) : (
              <div className="space-y-6 sm:space-y-7">
                {message && !cart.length && !filteredItems.length ? (
                  <div className="rounded-xl border border-[#D3E7D9] bg-[#E9F4EC] p-3 text-center text-sm text-[#1F6B3B]">{message}</div>
                ) : null}

                {!filteredItems.length ? (
                  <div className="py-14 text-center text-sm text-[#87918A]">{t.noResults}</div>
                ) : (
                  Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-baseline justify-between gap-3 border-b border-[#EAE4D8] pb-2">
                        <h2 className="font-display min-w-0 truncate text-lg font-bold text-[#26312B]">{category}</h2>
                        <span className="shrink-0 text-xs text-[#87918A]">
                          {items.length} {t.items}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {items.map((item) => {
                          const translatedName = translateItemName(item);
                          const translatedDescription = translateItemDescription(item);
                          const unavailable = item.is_available === false;

                          return (
                            <article
                              key={item.id}
                              className={`group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#EAE4D8] bg-white shadow-[0_12px_32px_-22px_rgba(38,49,43,0.25)] transition hover:shadow-[0_18px_44px_-22px_rgba(38,49,43,0.3)] sm:rounded-[26px] ${
                                unavailable ? 'opacity-60' : ''
                              }`}
                            >
                              <div
                                className={`relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[#E9F4EC] ${
                                  unavailable ? 'grayscale-[45%]' : ''
                                }`}
                              >
                                <MenuItemImage src={item.image_url} alt={translatedName} />
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
                                <h3 className="min-w-0 line-clamp-1 text-[16px] font-bold leading-snug text-[#26312B]">
                                  {translatedName}
                                </h3>
                                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-[#5A665E]">{translatedDescription}</p>
                                {unavailable && (
                                  <p className="mt-1.5 text-xs font-bold text-[#B0483F]">{t.unavailable}</p>
                                )}
                                <div className="mt-auto flex items-center justify-between gap-2.5 pt-3.5">
                                  <span className="shrink-0 text-[16px] font-bold text-[#1F6B3B]">
                                    {item.price.toFixed(2)} DH
                                  </span>
                                  <button
                                    type="button"
                                    disabled={tableBlocked || unavailable}
                                    onClick={() => addToCart(item)}
                                    className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#2F8F4E] px-4 py-2 text-sm font-bold text-white shadow-[0_6px_14px_rgba(47,143,78,0.24)] transition hover:bg-[#25763E] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none sm:min-h-11"
                                  >
                                    <Plus size={15} />
                                    {t.addToCart}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="hidden w-full max-w-xl lg:block lg:sticky lg:top-20 lg:h-fit">
          <Cart
            cart={cart}
            language={language}
            onUpdateQuantity={updateQuantity}
            onPlaceOrder={handlePlaceOrder}
            placingOrder={placingOrder}
            message={message}
            orderNotes={orderNotes}
            onOrderNotesChange={setOrderNotes}
          />
        </aside>
      </div>

      <NotificationToast message={toast?.message ?? ''} variant={toast?.variant} />

      <MobileCartBar
        itemCount={cartItemsCount}
        total={cartTotal}
        onOpen={() => setCartOpen(true)}
        labels={{ items: t.items, viewCart: t.viewCart }}
        isRTL={isRTL}
        visible={!cartOpen && !waiterModalOpen}
      />

      {waiterModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#26312B]/45 px-3 pb-3 safe-bottom sm:items-center sm:px-4 sm:pb-6">
          <div className="w-full max-w-md rounded-2xl border border-[#EAE4D8] bg-white p-5 shadow-[0_16px_48px_rgba(38,49,43,0.2)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold text-[#26312B]">{t.callWaiter}</p>
                <p className="mt-1 text-sm text-[#5A665E]">{t.chooseRequest}</p>
              </div>
              <button
                type="button"
                onClick={() => setWaiterModalOpen(false)}
                className="touch-target shrink-0 rounded-full border border-[#EAE4D8] bg-white p-2 text-[#87918A] transition hover:bg-[#E9F4EC] hover:text-[#26312B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => handleWaiterCall('bill')}
                disabled={submittingWaiterCall}
                className="touch-target flex min-h-12 w-full items-center justify-center rounded-xl bg-[#2F8F4E] px-4 py-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(47,143,78,0.24)] transition hover:bg-[#25763E] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {submittingWaiterCall ? '...' : t.requestBill}
              </button>
              <button
                type="button"
                onClick={() => handleWaiterCall('help')}
                disabled={submittingWaiterCall}
                className="touch-target flex min-h-12 w-full items-center justify-center rounded-xl border border-[#D3E7D9] bg-[#E9F4EC] px-4 py-3 text-sm font-bold text-[#1F6B3B] transition hover:border-[#2F8F4E]/45 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingWaiterCall ? '...' : t.requestHelp}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t.cancel}
            className="absolute inset-0 bg-[#26312B]/45"
            onClick={() => setCartOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-[#EAE4D8] bg-white shadow-[0_-12px_40px_rgba(38,49,43,0.2)] safe-bottom"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#EAE4D8] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-[#26312B]">{t.title}</p>
                <p className="text-sm text-[#5A665E]">
                  {cartItemsCount} {t.items}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="touch-target shrink-0 rounded-full border border-[#EAE4D8] bg-white p-2 text-[#87918A] transition hover:bg-[#E9F4EC] hover:text-[#26312B]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
              <Cart
                cart={cart}
                language={language}
                onUpdateQuantity={updateQuantity}
                onPlaceOrder={handlePlaceOrder}
                placingOrder={placingOrder}
                message={message}
                variant="sheet"
                orderNotes={orderNotes}
                onOrderNotesChange={setOrderNotes}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
