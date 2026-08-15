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
        const availableIds = new Set(data.map((item) => item.id));
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
      className={`min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-[linear-gradient(135deg,_#f4ebdc_0%,_#fffaf2_42%,_#efe0c0_100%)] ${isRTL ? 'rtl' : 'ltr'} ${cartItemsCount > 0 && !cartOpen ? 'mobile-page-bottom' : 'pb-4'} lg:pb-0`}
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

      <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 p-3 sm:gap-6 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:p-8">
        <section className="relative min-w-0 overflow-hidden rounded-[24px] border border-[#b08b4d]/30 bg-[#fcf7ef]/95 p-3 shadow-[0_30px_90px_-35px_rgba(101,70,27,0.45)] sm:rounded-[34px] sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(176,139,77,0.16),_transparent_36%),linear-gradient(135deg,_rgba(93,107,77,0.06),_transparent_45%)]" />

          <div className="relative space-y-4 sm:space-y-5">
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

            <div className="rounded-[20px] border border-[#b08b4d]/20 bg-[#fdf8ef]/70 p-3 text-sm text-[#6f5b3a] sm:rounded-[24px] sm:p-4">
              <p className="leading-6">{t.subtitle}</p>
            </div>

            {tableBlocked ? (
              <div className="rounded-[20px] border border-[#d6b47b]/50 bg-[#f8edd6] p-3 text-sm text-[#8a5f1d]">{t.tableUnavailable}</div>
            ) : null}

            {loading ? (
              <div className="rounded-[24px] border border-dashed border-[#b08b4d]/40 bg-[#f7efe1] p-8 text-center text-sm text-[#7a6140]">
                {t.loading}
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                {message && !cart.length && !filteredItems.length ? (
                  <div className="rounded-[20px] border border-[#d6b47b]/50 bg-[#f8edd6] p-3 text-sm text-[#8a5f1d]">{message}</div>
                ) : null}

                {!filteredItems.length ? (
                  <div className="rounded-[24px] border border-dashed border-[#b08b4d]/35 bg-[#f8efe2] p-8 text-center text-sm text-[#7a6140]">
                    {t.noResults}
                  </div>
                ) : (
                  Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex min-w-0 items-center justify-between gap-2 rounded-full border border-[#b08b4d]/25 bg-[#f5ebda] px-3 py-2.5 sm:px-4">
                        <h2 className="min-w-0 truncate text-base font-semibold text-[#2f2417] sm:text-lg">{category}</h2>
                        <span className="shrink-0 text-xs text-[#796447] sm:text-sm">
                          {items.length} {t.items}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {items.map((item) => {
                          const translatedName = translateItemName(item);
                          const translatedDescription = translateItemDescription(item);

                          return (
                            <article
                              key={item.id}
                              className="group min-w-0 overflow-hidden rounded-[20px] border border-[#b08b4d]/30 bg-[linear-gradient(135deg,_#fffdf9_0%,_#f6ebdb_100%)] p-3 shadow-[0_18px_45px_-24px_rgba(94,62,26,0.5)] sm:rounded-[24px] sm:p-4"
                            >
                              <MenuItemImage src={item.image_url} alt={translatedName} />
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="line-clamp-2 font-semibold text-[#2f2417]">{translatedName}</h3>
                                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6f5b3a]">{translatedDescription}</p>
                                </div>
                                <div className="shrink-0 rounded-full bg-[#5d6b4d] px-2.5 py-1 text-xs font-semibold text-[#f8f2e6] sm:px-3 sm:text-sm">
                                  {item.price.toFixed(2)} DH
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={tableBlocked}
                                onClick={() => addToCart(item)}
                                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2f2417] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#4a3723] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-4 sm:min-h-12 sm:py-3"
                              >
                                <Plus size={16} />
                                {t.addToCart}
                              </button>
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

        <aside className="hidden w-full max-w-xl lg:block lg:sticky lg:top-24 lg:h-fit">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f140a]/70 px-3 pb-3 safe-bottom sm:items-center sm:px-4 sm:pb-6">
          <div className="w-full max-w-md rounded-[28px] border border-[#b08b4d]/30 bg-[#fcf7ef] p-5 shadow-[0_30px_90px_-30px_rgba(25,17,10,0.8)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#2f2417]">{t.callWaiter}</p>
                <p className="mt-1 text-sm text-[#7a6140]">{t.chooseRequest}</p>
              </div>
              <button
                type="button"
                onClick={() => setWaiterModalOpen(false)}
                className="touch-target shrink-0 rounded-full border border-[#b08b4d]/20 bg-white p-2 text-[#5b4325]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => handleWaiterCall('bill')}
                disabled={submittingWaiterCall}
                className="touch-target flex w-full items-center justify-center rounded-full bg-[#2f2417] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingWaiterCall ? '...' : t.requestBill}
              </button>
              <button
                type="button"
                onClick={() => handleWaiterCall('help')}
                disabled={submittingWaiterCall}
                className="touch-target flex w-full items-center justify-center rounded-full border border-[#b08b4d]/30 bg-[#fffaf3] px-4 py-3 text-sm font-semibold text-[#5b4325] disabled:cursor-not-allowed disabled:opacity-70"
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
            className="absolute inset-0 bg-[#1f140a]/70"
            onClick={() => setCartOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] border border-[#b08b4d]/30 bg-[linear-gradient(135deg,_#2f2417_0%,_#17110d_100%)] shadow-[0_30px_90px_-30px_rgba(25,17,10,0.8)] safe-bottom"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{t.title}</p>
                <p className="text-sm text-stone-300">
                  {cartItemsCount} {t.items}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="touch-target shrink-0 rounded-full border border-white/15 bg-white/10 p-2 text-white"
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
