'use client';

import { Minus, Plus, ShoppingBag, Send } from 'lucide-react';
import { NOTE_MAX_LENGTH } from '@/lib/orderNotes';

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
  variant?: 'default' | 'sheet';
  orderNotes: string;
  onOrderNotesChange: (value: string) => void;
};

const translations = {
  en: {
    title: 'Your Order',
    empty: 'Your cart is empty.',
    total: 'Total',
    checkout: 'Place Order',
    item: 'item',
    items: 'items',
    notesLabel: 'Special instructions (optional)',
    notesPlaceholder: 'e.g. no onion, extra sauce...',
  },
  fr: {
    title: 'Votre commande',
    empty: 'Votre panier est vide.',
    total: 'Total',
    checkout: 'Passer la commande',
    item: 'article',
    items: 'articles',
    notesLabel: 'Instructions spéciales (optionnel)',
    notesPlaceholder: 'ex. sans oignon, sauce en plus...',
  },
  ar: {
    title: 'طلبك',
    empty: 'سلة التسوق فارغة.',
    total: 'الإجمالي',
    checkout: 'إرسال الطلب',
    item: 'عنصر',
    items: 'عناصر',
    notesLabel: 'ملاحظات إضافية على الطلب (اختياري)',
    notesPlaceholder: 'مثال: بدون بصل، زيادة صوص...',
  },
};

export default function Cart({
  cart,
  language,
  onUpdateQuantity,
  onPlaceOrder,
  placingOrder,
  message,
  variant = 'default',
  orderNotes,
  onOrderNotesChange,
}: Props) {
  const t = translations[language];
  const isRTL = language === 'ar';
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isSheet = variant === 'sheet';

  return (
    <div
      className={`${isRTL ? 'text-right' : 'text-left'} ${
        isSheet
          ? ''
          : 'rounded-2xl border border-[#EDE3D0] bg-white p-4 shadow-[0_1px_3px_rgba(41,37,33,0.05)] sm:p-5'
      }`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {!isSheet ? (
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-[#292521]">{t.title}</h2>
            <p className="mt-0.5 text-sm text-stone-500">
              {cart.length} {cart.length === 1 ? t.item : t.items}
            </p>
          </div>
          <div className="shrink-0 rounded-full bg-[#EFE6D8] p-3 text-[#8B5E34]">
            <ShoppingBag size={18} />
          </div>
        </div>
      ) : null}

      <div className={isSheet ? 'space-y-2.5' : 'mt-5 space-y-2.5'}>
        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E0D3BC] bg-[#FBF7F0] p-6 text-center text-sm text-stone-500">
            {t.empty}
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#EDE3D0] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#292521]">{item.name}</p>
                  <p className="mt-0.5 text-[13px] text-stone-500">{item.price.toFixed(2)} DH</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#EFE6D8] p-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#292521] shadow-sm transition hover:bg-[#F6EFE3]"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="min-w-6 text-center text-sm font-semibold text-[#292521]">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#292521] shadow-sm transition hover:bg-[#F6EFE3]"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 ? (
        <div className={isSheet ? 'mt-4' : 'mt-5'}>
          <label htmlFor="order-notes" className="mb-1.5 block text-[13px] font-medium text-stone-600">
            {t.notesLabel}
          </label>
          <textarea
            id="order-notes"
            value={orderNotes}
            onChange={(e) => onOrderNotesChange(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            className="w-full resize-none rounded-xl border border-[#E7DCC8] bg-[#FBF7F0] px-3 py-2.5 text-sm text-[#292521] outline-none transition placeholder:text-stone-400 focus:border-[#C89F5C] focus:bg-white"
          />
        </div>
      ) : null}

      <div className={`${isSheet ? 'mt-4' : 'mt-5'} rounded-xl bg-[#EFE6D8] p-3.5`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6B5138]">{t.total}</span>
          <span className="text-lg font-semibold text-[#292521]">{total.toFixed(2)} DH</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={placingOrder || cart.length === 0}
        className={`${isSheet ? 'mt-4' : 'mt-5'} flex min-h-12 w-full touch-target items-center justify-center gap-2 rounded-xl bg-[#8B5E34] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7A4E28] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <Send size={15} />
        {placingOrder ? '...' : t.checkout}
      </button>

      {message ? <p className="mt-3 text-center text-[13px] text-[#8B5E34]">{message}</p> : null}
    </div>
  );
}
