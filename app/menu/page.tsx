'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronUp, Plus, Search, Sparkles, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { translateTextClient } from '@/lib/translateClient';
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
  const [tableId, setTableId] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [openSearch, setOpenSearch] = useState(false);
  const [translationsCache, setTranslationsCache] = useState<Record<string, string>>({});

  const t = translations[language];
  const isRTL = language === 'ar';
  const searchQueryNormalized = normalize(searchQuery);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // builtin translation dictionary (normalized keys)
  const translationsDict: Record<string, Record<Language, string>> = {
    // categories
    'الطواجن': { en: 'Tagines', fr: 'Tajines', ar: 'الطواجن' },
    'المشروبات': { en: 'Drinks', fr: 'Boissons', ar: 'المشروبات' },
    'المقبلات': { en: 'Appetizers', fr: 'Entrées', ar: 'المقبلات' },
    'التحليات': { en: 'Desserts', fr: 'Desserts', ar: 'التحليات' },
    'السلطات': { en: 'Salads', fr: 'Salades', ar: 'السلطات' },
    'الأطباق الرئيسية': { en: 'Main Dishes', fr: 'Plats', ar: 'الأطباق الرئيسية' },
    'boissons': { en: 'Drinks', fr: 'Boissons', ar: 'المشروبات' },
    'plats': { en: 'Main Dishes', fr: 'Plats', ar: 'الأطباق الرئيسية' },
    'salades': { en: 'Salads', fr: 'Salades', ar: 'السلطات' },
    // common items
    'mushroom pasta': { en: 'Mushroom Pasta', fr: 'Pâtes aux champignons', ar: 'باستا بالفطر' },
    'grilled chicken': { en: 'Grilled Chicken', fr: 'Poulet grillé', ar: 'دجاج مشوي' },
    'classic salad': { en: 'Classic Salad', fr: 'Salade classique', ar: 'سلطة كلاسيكية' },
    'fresh lemonade': { en: 'Fresh Lemonade', fr: 'Limonade fraîche', ar: 'ليموناضة طازجة' },
    'mint tea': { en: 'Mint Tea', fr: 'Thé à la menthe', ar: 'شاي بالنعناع' },
    'moroccan couscous': { en: 'Moroccan Couscous', fr: 'Couscous marocain', ar: 'كسكس مغربي' },
  };

  const translateText = (text: string | undefined, target: Language) => {
    if (!text) return '';
    const key = normalize(text || '');
    const cacheKey = `${text}:::${target}`;
    if (translationsCache[cacheKey]) return translationsCache[cacheKey];
    // prefer explicit locale bundles first
    const categoryLabels = (t as LocaleBundle & { categoryLabels?: Record<string, string> }).categoryLabels ?? {};
    const itemLabels = (t as LocaleBundle & { itemLabels?: Record<string, string> }).itemLabels ?? {};
    const itemDescriptions = (t as LocaleBundle & { itemDescriptions?: Record<string, string> }).itemDescriptions ?? {};

    if (itemLabels[key]) return itemLabels[key];
    if (itemDescriptions[key]) return itemDescriptions[key];
    if (categoryLabels[key]) return categoryLabels[key];

    if (translationsDict[key] && translationsDict[key][target]) return translationsDict[key][target];

    // fallback: if text looks like already in target language, return it; otherwise return original (no external calls)
    return text;
  };

  const translateCategory = (value: string) => {
    return translateText(value, language);
  };

  const translateItemName = (item: MenuItem) => translateText(item.name, language);

  const translateItemDescription = (item: MenuItem) => translateText(item.description || item.name, language);

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

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true });

      if (!error && data) {
        setMenuItems(data as MenuItem[]);
      } else {
        setMenuItems([]);
        setMessage(t.loadError);
      }
      setLoading(false);
    };
    // read validated table info from localStorage if present
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('elk_table') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.table_id) setTableId(parsed.table_id);
        if (parsed?.table_number) setTableNumber(parsed.table_number);
      }
    } catch (e) {
      // ignore
    }

    loadMenu();
  }, [language, t.connectionError, t.loadError]);

  useEffect(() => {
    // fetch server-driven categories
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) return;
        const cats = await res.json();
        setCategories((cats || []).filter(Boolean));
      } catch (e) {
        // ignore
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    // fallback: derive categories from menuItems if API returned none
    if ((!categories || categories.length === 0) && menuItems && menuItems.length) {
      const cats = Array.from(new Set(menuItems.map((m) => m.category).filter(Boolean)));
      setCategories(cats);
    }
  }, [menuItems, categories]);

  // prefetch translations for visible texts when language changes
  useEffect(() => {
    let mounted = true;

    const fetchTranslations = async () => {
      const toTranslate = new Set<string>();

      const categoryLabels = (t as LocaleBundle & { categoryLabels?: Record<string, string> }).categoryLabels ?? {};
      const itemLabels = (t as LocaleBundle & { itemLabels?: Record<string, string> }).itemLabels ?? {};
      const itemDescriptions = (t as LocaleBundle & { itemDescriptions?: Record<string, string> }).itemDescriptions ?? {};

      // gather categories
      categories.forEach((c) => {
        if (!c) return;
        const key = normalize(c);
        const cacheKey = `${c}:::${language}`;
        if (translationsCache[cacheKey]) return;
        if (categoryLabels[key]) return;
        if (translationsDict[key] && translationsDict[key][language]) return;
        toTranslate.add(c);
      });

      // gather item names and descriptions
      menuItems.forEach((it) => {
        if (it.name) {
          const cacheKey = `${it.name}:::${language}`;
          const key = normalize(it.name);
          if (!translationsCache[cacheKey] && !itemLabels[key] && !(translationsDict[key] && translationsDict[key][language])) {
            toTranslate.add(it.name);
          }
        }
        const desc = it.description || it.name;
        if (desc) {
          const cacheKey = `${desc}:::${language}`;
          const key = normalize(desc);
          if (!translationsCache[cacheKey] && !itemDescriptions[key] && !(translationsDict[key] && translationsDict[key][language])) {
            toTranslate.add(desc);
          }
        }
      });

      for (const text of Array.from(toTranslate)) {
        try {
          const translated = await translateTextClient(text, language);
          if (!mounted) return;
          setTranslationsCache((prev) => ({ ...prev, [`${text}:::${language}`]: translated }));
        } catch (e) {
          // ignore per-item failures
        }
      }
    };

    fetchTranslations();

    return () => {
      mounted = false;
    };
  }, [language, menuItems, categories]);

  useEffect(() => {
    // reset selected category when categories change
    if (categories.length === 0) {
      setSelectedCategory('ALL');
    }
  }, [categories.length]);

  // no async translation listeners required with built-in dictionary

  const filteredItems = useMemo(() => {
    let items = menuItems.slice();

    // category filter
    if (selectedCategory && selectedCategory !== 'ALL') {
      items = items.filter((it) => normalize(it.category) === normalize(selectedCategory));
    }

    if (!searchQueryNormalized) return items;

    return items.filter((item) => {
      const translatedName = translateItemName(item);
      const translatedDescription = translateItemDescription(item);
      const translatedCategory = translateCategory(item.category);

      return [translatedName, translatedDescription, translatedCategory].some((value) => normalize(value).includes(searchQueryNormalized));
    });
  }, [menuItems, searchQueryNormalized, language, selectedCategory]);

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

    const payload: any = {
      items: itemsPayload,
      total_price: totalPrice,
      table_number: tableNumber ?? 1,
      status: 'pending',
    };

    if (tableId) payload.table_id = tableId;

    const { error } = await supabase.from('orders').insert(payload);

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
      setWaiterToast(t.callError);
      setSubmittingWaiterCall(false);
      setWaiterModalOpen(false);
      return;
    }
    const messageMap: Record<string, string> = {
      bill: 'طلب الحساب',
      help: 'استدعاء النادل',
    };

    const waiterPayload: any = {
      table_number: tableNumber ?? 1,
      message: messageMap[requestType] || 'استدعاء النادل',
      status: 'pending',
    };

    if (tableId) waiterPayload.table_id = tableId;

    try {
      const { error } = await supabase.from('waiter_calls').insert(waiterPayload);
      if (error) {
        console.error('waiter_calls insert error', error);
        setWaiterToast(t.callError);
      } else {
        setWaiterToast(t.callSent);
      }
    } catch (err) {
      console.error('waiter call failed', err);
      setWaiterToast(t.callError);
    } finally {
      setSubmittingWaiterCall(false);
      setWaiterModalOpen(false);
    }
  };

  return (
    <main className={`min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,_#f4ebdc_0%,_#fffaf2_42%,_#efe0c0_100%)] ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile sticky categories and collapsible search */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#fffaf3] via-[#fffaf3] to-transparent/0 px-3 pt-3 pb-2">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              aria-label={t.searchPlaceholder}
              onClick={() => setOpenSearch((s) => !s)}
              className="rounded-full bg-white/90 p-2 shadow-sm"
            >
              <Search size={18} className="text-[#2f2417]" />
            </button>
          </div>
          <div className="flex-1" />
        </div>

        {openSearch ? (
          <div className="mt-3 px-3">
            <label className="flex items-center gap-2 rounded-full border border-[#b08b4d]/30 bg-white px-3 py-2 shadow-sm">
              <Search size={18} className="text-[#9a6c29]" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent text-sm text-[#2f2417] outline-none placeholder:text-[#9d8b6a]"
              />
              <button type="button" onClick={() => { setOpenSearch(false); setSearchQuery(''); }} className="text-sm text-[#7a6140]">{t.cancel}</button>
            </label>
          </div>
        ) : null}

        <div className="mt-3 -mx-3 overflow-x-auto px-3 pb-2">
          <div className="flex gap-3 flex-row">
            {/* All button: always rendered first on the left */}
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${selectedCategory === 'ALL' ? 'bg-[#C9A227] text-[#22170e] shadow-sm' : 'bg-white/90 text-[#5b4325] border border-[#e9dfbf]'}`}
            >
              {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'}
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${selectedCategory === cat ? 'bg-[#C9A227] text-[#22170e] shadow-sm' : 'bg-white/90 text-[#5b4325] border border-[#e9dfbf]'}`}
              >
                {translateCategory(cat)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-3 pb-28 sm:gap-6 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:p-8 lg:pb-8">
        <section className="relative overflow-hidden rounded-[34px] border border-[#b08b4d]/30 bg-[#fcf7ef]/95 p-3 shadow-[0_30px_90px_-35px_rgba(101,70,27,0.45)] backdrop-blur-sm sm:p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(176,139,77,0.16),_transparent_36%),linear-gradient(135deg,_rgba(93,107,77,0.06),_transparent_45%)]" />
          <div className="relative space-y-4 sm:space-y-5">
            <div className="sticky top-0 z-20 -mx-1 rounded-[28px] border border-transparent bg-transparent p-0">
              <div className="flex items-center justify-between gap-3 px-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-[14px] bg-transparent p-0">
                    <img
                      src="https://placehold.co/96x96?text=Logo"
                      alt={t.logoAlt}
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 rounded-[12px] object-cover sm:h-12 sm:w-12"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2f8f4a] sm:text-xs">
                      <Sparkles size={14} />
                      {t.brand}
                    </div>
                    <h1 className="truncate text-lg font-semibold text-[#2f2417] sm:text-xl">{t.title}</h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWaiterModalOpen(true)}
                    className="min-h-9 rounded-full bg-[#2f8f4a] px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:scale-105"
                  >
                    {t.callWaiter}
                  </button>
                  <div className="flex gap-2">
                    {(['en', 'fr', 'ar'] as Language[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLanguage(code)}
                        className={`min-h-9 flex items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition duration-200 ${language === code ? 'bg-[#2f8f4a] text-white' : 'bg-white/90 text-[#2f2417] border'}`}
                      >
                        {t.languageOptions[code]}
                      </button>
                    ))}
                  </div>
                </div>
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

      {/* Floating sticky search icon (mobile) */}
      <button
        aria-label={t.searchPlaceholder}
        onClick={() => setOpenSearch((s) => !s)}
        className="lg:hidden fixed right-4 bottom-24 z-50 rounded-full bg-[#C9A227] p-3 shadow-lg text-[#22170e]"
      >
        <Search size={20} />
      </button>

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
                <p className="text-lg font-semibold text-[#2f2417]">{t.callWaiter}</p>
                <p className="mt-1 text-sm text-[#7a6140]">{t.chooseRequest}</p>
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
                {submittingWaiterCall ? '...' : t.requestBill}
              </button>
              <button
                type="button"
                onClick={() => handleWaiterCall('help')}
                disabled={submittingWaiterCall}
                className="flex w-full items-center justify-center rounded-full border border-[#b08b4d]/30 bg-[#fffaf3] px-4 py-3 text-sm font-semibold text-[#5b4325] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f5e4c4] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingWaiterCall ? '...' : t.requestHelp}
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
