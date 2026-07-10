'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronUp, Plus, Search, Sparkles, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import Cart from './components/Cart';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import ar from '@/locales/ar.json';

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string | null;
};

type Language = 'en' | 'fr' | 'ar';

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type LocaleBundle = typeof en;

const translations = { en, fr, ar };

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export default function MenuPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [waiterModalOpen, setWaiterModalOpen] = useState(false);
  const [waiterToast, setWaiterToast] = useState('');
  const [submittingWaiterCall, setSubmittingWaiterCall] = useState(false);

  const t = translations[language];
  const isRTL = language === 'ar';
  const searchQueryNormalized = normalize(searchQuery);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const translateCategory = (value: string) => {
    const categoryLabels = (t as LocaleBundle & { categoryLabels?: Record<string, string> }).categoryLabels ?? {};
    return categoryLabels[normalize(value)] || value;
  };

  const translateItemName = (item: MenuItem) => {
    const itemLabels = (t as LocaleBundle & { itemLabels?: Record<string, string> }).itemLabels ?? {};
    return itemLabels[normalize(item.name)] || item.name;
  };

  const translateItemDescription = (item: MenuItem) => {
    const itemDescriptions = (t as LocaleBundle & { itemDescriptions?: Record<string, string> }).itemDescriptions ?? {};
    return itemDescriptions[normalize(item.name)] || item.description;
  };

  useEffect(() => {
    document.body.style.overflow = cartOpen || waiterModalOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [cartOpen, waiterModalOpen]);

  useEffect(() => {
    if (!waiterToast) return;

    const timer = window.setTimeout(() => setWaiterToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [waiterToast]);

  useEffect(() => {
    const loadMenu = async () => {
      setLoading(true);
      setMessage('');

      if (!isSupabaseConfigured || !supabase) {
        setMenuItems([]);
        setMessage(t.connectionError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from('menu_items').select('*').order('category', { ascending: true });

      if (!error && data) {
        setMenuItems(data as MenuItem[]);
      } else {
        setMenuItems([]);
        setMessage(t.loadError);
      }
      setLoading(false);
    };

    loadMenu();
  }, [language, t.connectionError, t.loadError]);

  const filteredItems = useMemo(() => {
    if (!searchQueryNormalized) return menuItems;

    return menuItems.filter((item) => {
      const translatedName = translateItemName(item);
      const translatedDescription = translateItemDescription(item);
      const translatedCategory = translateCategory(item.category);

      return [translatedName, translatedDescription, translatedCategory].some((value) => normalize(value).includes(searchQueryNormalized));
    });
  }, [menuItems, searchQueryNormalized, language]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
      const category = translateCategory(item.category) || 'OTHER';
      acc[category] = acc[category] ? [...acc[category], item] : [item];
      return acc;
    }, {});
  }, [filteredItems, language]);

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

    setPlacingOrder(true);
    setMessage('');

    if (!isSupabaseConfigured || !supabase) {
      setMessage(t.connectionError);
      setPlacingOrder(false);
      return;
    }

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemsPayload = cart.map((item) => ({
      item_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      name: item.name,
    }));

    const { error } = await supabase.from('orders').insert({
      items: itemsPayload,
      total_price: totalPrice,
      table_number: 1,
      status: 'pending',
    });

    if (error) {
      setMessage(t.orderError);
    } else {
      setCart([]);
      setCartOpen(false);
      setMessage(t.orderSuccess);
    }

    setPlacingOrder(false);
  };

  const handleWaiterCall = async (requestType: 'bill' | 'help') => {
    setSubmittingWaiterCall(true);
    setWaiterToast('');

    if (!isSupabaseConfigured || !supabase) {
      setWaiterToast('تعذر إرسال الطلب. تحقق من إعدادات Supabase.');
      setSubmittingWaiterCall(false);
      setWaiterModalOpen(false);
      return;
    }

    const { error } = await supabase.from('waiter_calls').insert({
      request_type: requestType,
      table_number: 1,
      status: 'pending',
    });

    setSubmittingWaiterCall(false);
    setWaiterModalOpen(false);

    if (error) {
      setWaiterToast('تعذر إرسال الطلب. حاول مرة أخرى.');
    } else {
      setWaiterToast('تم إرسال الطلب، النادل في الطريق');
    }
  };

  return (
    <main className={`min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,_#f4ebdc_0%,_#fffaf2_42%,_#efe0c0_100%)] ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-3 pb-28 sm:gap-6 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:p-8 lg:pb-8">
        <section className="relative overflow-hidden rounded-[34px] border border-[#b08b4d]/30 bg-[#fcf7ef]/95 p-3 shadow-[0_30px_90px_-35px_rgba(101,70,27,0.45)] backdrop-blur-sm sm:p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(176,139,77,0.16),_transparent_36%),linear-gradient(135deg,_rgba(93,107,77,0.06),_transparent_45%)]" />
          <div className="relative space-y-4 sm:space-y-5">
            <div className="sticky top-0 z-20 -mx-1 rounded-[28px] border border-[#b08b4d]/35 bg-[linear-gradient(135deg,_#fdf8ee_0%,_#f2e3c8_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur sm:p-4">
              <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#b08b4d]/70 to-transparent" />
              <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-[#5d6b4d]/50 to-transparent" />
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-[20px] border border-[#b08b4d]/35 bg-[#fffaf3] p-2 shadow-inner">
                      <img
                        src="https://placehold.co/96x96?text=Logo"
                        alt={t.logoAlt}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 rounded-[16px] object-cover sm:h-14 sm:w-14"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6c29] sm:text-xs">
                        <Sparkles size={14} />
                        {t.brand}
                      </div>
                      <h1 className="truncate text-lg font-semibold text-[#2f2417] sm:text-xl">{t.title}</h1>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setWaiterModalOpen(true)}
                      className="min-h-11 rounded-full border border-[#b08b4d]/35 bg-[#2f2417] px-3 py-2 text-sm font-semibold text-[#fff7e8] transition duration-300 touch-manipulation hover:-translate-y-0.5 hover:bg-[#4a3723]"
                    >
                      استدعاء النادل
                    </button>
                    {(['en', 'fr', 'ar'] as Language[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLanguage(code)}
                        className={`min-h-11 flex-1 rounded-full border px-3 py-2 text-sm font-medium transition duration-300 touch-manipulation ${language === code ? 'border-[#8b5e2b] bg-[#8b5e2b] text-[#fff7e8] shadow-[0_10px_30px_-12px_rgba(139,94,43,0.7)]' : 'border-[#b08b4d]/35 bg-[#fffaf3] text-[#5b4325] hover:-translate-y-0.5 hover:border-[#8b5e2b] hover:bg-[#f5e4c4]'}`}
                      >
                        {t.languageOptions[code]}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 rounded-full border border-[#b08b4d]/40 bg-[#fffaf3] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Search size={18} className="text-[#9a6c29]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-transparent text-sm text-[#2f2417] outline-none placeholder:text-[#9d8b6a]"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#b08b4d]/20 bg-[#fdf8ef]/70 p-3 text-sm text-[#6f5b3a] shadow-sm sm:p-4">
              <p className="leading-6">{t.subtitle}</p>
            </div>

            {loading ? (
              <div className="rounded-[24px] border border-dashed border-[#b08b4d]/40 bg-[#f7efe1] p-8 text-center text-sm text-[#7a6140]">{t.loading}</div>
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
                      <div className="flex items-center justify-between rounded-full border border-[#b08b4d]/25 bg-[#f5ebda] px-4 py-2.5">
                        <h2 className="text-lg font-semibold text-[#2f2417]">{category}</h2>
                        <span className="text-sm text-[#796447]">
                          {items.length} {t.items}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {items.map((item) => {
                          const translatedName = translateItemName(item);
                          const translatedDescription = translateItemDescription(item);

                          return (
                            <article key={item.id} className="group rounded-[24px] border border-[#b08b4d]/30 bg-[linear-gradient(135deg,_#fffdf9_0%,_#f6ebdb_100%)] p-4 shadow-[0_18px_45px_-24px_rgba(94,62,26,0.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(94,62,26,0.6)]">
                              {item.image_url ? (
                                <img src={item.image_url} alt={translatedName} className="mb-3 h-40 w-full rounded-[18px] object-cover" />
                              ) : null}
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-semibold text-[#2f2417]">{translatedName}</h3>
                                  <p className="mt-1 text-sm leading-6 text-[#6f5b3a]">{translatedDescription}</p>
                                </div>
                                <div className="rounded-full bg-[#5d6b4d] px-3 py-1 text-sm font-semibold text-[#f8f2e6]">
                                  {item.price.toFixed(2)} DH
                                </div>
                              </div>
                              <button
                                onClick={() => addToCart(item)}
                                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2f2417] px-4 py-3 text-sm font-medium text-white transition duration-300 touch-manipulation hover:-translate-y-0.5 hover:bg-[#4a3723]"
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

        <aside className="hidden w-full max-w-xl lg:block lg:sticky lg:top-6 lg:h-fit">
          <Cart
            cart={cart}
            language={language}
            onUpdateQuantity={updateQuantity}
            onPlaceOrder={handlePlaceOrder}
            placingOrder={placingOrder}
            message={message}
          />
        </aside>
      </div>

      {waiterToast ? (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#2f2417] px-4 py-3 text-sm font-medium text-white shadow-[0_20px_60px_-18px_rgba(25,17,10,0.85)]">
          {waiterToast}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full border border-[#b08b4d]/35 bg-[#2f2417] px-4 py-3 text-white shadow-[0_20px_60px_-18px_rgba(25,17,10,0.85)] lg:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/10 p-2">
            <ChevronUp size={16} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{cartItemsCount} {cartItemsCount === 1 ? t.items : t.items}</p>
            <p className="text-xs text-stone-300">{cartTotal.toFixed(2)} DH</p>
          </div>
        </div>
        <span className="text-sm font-medium">{t.title}</span>
      </button>

      {waiterModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f140a]/70 px-4 py-6">
          <div className="w-full max-w-md rounded-[28px] border border-[#b08b4d]/30 bg-[#fcf7ef] p-5 shadow-[0_30px_90px_-30px_rgba(25,17,10,0.8)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#2f2417]">استدعاء النادل</p>
                <p className="mt-1 text-sm text-[#7a6140]">اختر نوع الطلب</p>
              </div>
              <button type="button" onClick={() => setWaiterModalOpen(false)} className="rounded-full border border-[#b08b4d]/20 bg-white p-2 text-[#5b4325]">
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => handleWaiterCall('bill')}
                disabled={submittingWaiterCall}
                className="flex w-full items-center justify-center rounded-full bg-[#2f2417] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#4a3723] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingWaiterCall ? '...' : 'طلب الحساب'}
              </button>
              <button
                type="button"
                onClick={() => handleWaiterCall('help')}
                disabled={submittingWaiterCall}
                className="flex w-full items-center justify-center rounded-full border border-[#b08b4d]/30 bg-[#fffaf3] px-4 py-3 text-sm font-semibold text-[#5b4325] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f5e4c4] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingWaiterCall ? '...' : 'مساعدة'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f140a]/70 px-2 pb-2 pt-16 lg:hidden">
          <div className="w-full max-w-xl rounded-[28px] border border-[#b08b4d]/30 bg-[#fcf7ef] shadow-[0_30px_90px_-30px_rgba(25,17,10,0.8)]">
            <div className="flex items-center justify-between border-b border-[#b08b4d]/20 p-4">
              <div>
                <p className="text-sm font-semibold text-[#2f2417]">{t.title}</p>
                <p className="text-sm text-[#7a6140]">{cartItemsCount} {cartItemsCount === 1 ? t.items : t.items}</p>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="rounded-full border border-[#b08b4d]/20 bg-white p-2 text-[#5b4325]">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-4">
              <Cart
                cart={cart}
                language={language}
                onUpdateQuantity={updateQuantity}
                onPlaceOrder={handlePlaceOrder}
                placingOrder={placingOrder}
                message={message}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
