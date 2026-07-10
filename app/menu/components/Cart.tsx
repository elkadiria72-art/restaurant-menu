'use client';

import { Minus, Plus, ShoppingBag, ArrowRightLeft } from 'lucide-react';

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type Props = {
  cart: CartItem[];
  language: 'en' | 'fr' | 'ar';
  onUpdateQuantity: (id: number, delta: number) => void;
  onPlaceOrder: () => void;
  placingOrder: boolean;
  message: string;
};

const translations = {
  en: {
    title: 'Your Order',
    empty: 'Your cart is empty.',
    total: 'Total',
    checkout: 'Place Order',
    item: 'item',
    items: 'items',
  },
  fr: {
    title: 'Votre commande',
    empty: 'Votre panier est vide.',
    total: 'Total',
    checkout: 'Passer la commande',
    item: 'article',
    items: 'articles',
  },
  ar: {
    title: 'طلبك',
    empty: 'سلة التسوق فارغة.',
    total: 'الإجمالي',
    checkout: 'إرسال الطلب',
    item: 'عنصر',
    items: 'عناصر',
  },
};

export default function Cart({ cart, language, onUpdateQuantity, onPlaceOrder, placingOrder, message }: Props) {
  const t = translations[language];
  const isRTL = language === 'ar';
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className={`relative overflow-hidden rounded-[32px] border border-[#b08b4d]/30 bg-[linear-gradient(135deg,_#2f2417_0%,_#17110d_100%)] p-4 text-white shadow-[0_30px_90px_-28px_rgba(25,17,10,0.75)] sm:p-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,214,140,0.16),_transparent_36%)]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t.title}</h2>
            <p className="mt-1 text-sm text-stone-300">
              {cart.length} {cart.length === 1 ? t.item : t.items}
            </p>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 p-3">
            <ShoppingBag size={20} />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {cart.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-stone-300">{t.empty}</div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="rounded-[22px] border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-stone-300">{item.price.toFixed(2)} DH</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-white/10 p-1">
                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="rounded-full p-1.5 transition hover:bg-white/10">
                      <Minus size={15} />
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="rounded-full p-1.5 transition hover:bg-white/10">
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-[22px] border border-white/10 bg-white/10 p-4">
          <div className="flex items-center justify-between text-sm text-stone-300">
            <span>{t.total}</span>
            <span className="text-xl font-semibold text-white">{total.toFixed(2)} DH</span>
          </div>
        </div>

        <button
          onClick={onPlaceOrder}
          disabled={placingOrder}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#d6a24a] px-4 py-3 text-sm font-semibold text-[#22170e] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e3b15f] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <ArrowRightLeft size={16} />
          {placingOrder ? '...' : t.checkout}
        </button>

        {message ? <p className="mt-3 text-center text-sm text-[#f2d59c]">{message}</p> : null}
      </div>
    </div>
  );
}
