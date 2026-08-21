'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { OrderRecord } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  served: 'تم التقديم',
  cancelled: 'ملغى',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-100 text-amber-900 border-amber-200',
  preparing: 'bg-sky-100 text-sky-900 border-sky-200',
  ready: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  served: 'bg-stone-100 text-stone-700 border-stone-200',
  cancelled: 'bg-red-100 text-red-900 border-red-200',
};

const NEXT_ACTIONS: Record<string, { label: string; next: string }[]> = {
  new: [{ label: 'بدء التحضير', next: 'preparing' }],
  preparing: [{ label: 'جاهز للتقديم', next: 'ready' }],
  ready: [{ label: 'تم التقديم', next: 'served' }],
};

type Props = {
  initialOrders: OrderRecord[];
};

function formatTime(value?: string | null) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ar-MA', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminOrdersBoard({ initialOrders }: Props) {
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as OrderRecord[];
      setOrders(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadOrders();
      })
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.status !== 'served' && order.status !== 'cancelled');
  }, [orders, filter]);

  const updateStatus = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status }),
      });
      if (res.ok) await loadOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2f2417]">إدارة الطلبات</h1>
          <p className="mt-1 text-sm text-[#6f5b3a]">عرض مباشر للطلبات مع ملاحظات الزبناء</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/qr"
            className="rounded-full border border-[#b08b4d]/30 bg-white px-4 py-2 text-sm font-medium text-[#5b4325]"
          >
            QR الطاولات
          </Link>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === 'active' ? 'bg-[#2f2417] text-white' : 'border border-[#e9dfbf] bg-white text-[#5b4325]'
            }`}
          >
            النشطة
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === 'all' ? 'bg-[#2f2417] text-white' : 'border border-[#e9dfbf] bg-white text-[#5b4325]'
            }`}
          >
            الكل
          </button>
        </div>
      </div>

      {!visibleOrders.length ? (
        <div className="rounded-2xl border border-dashed border-[#b08b4d]/35 bg-[#fffaf3] p-10 text-center text-sm text-[#7a6140]">
          لا توجد طلبات حالياً.
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleOrders.map((order) => {
            const actions = NEXT_ACTIONS[order.status] ?? [];
            const notes = order.notes?.trim();

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-[#b08b4d]/25 bg-[#fffaf3] p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#2f2417]">طاولة {order.table_number}</h2>
                      <span className="text-xs text-[#7a6140]">#{order.id}</span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.status] ?? STATUS_STYLES.new}`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#7a6140]">{formatTime(order.created_at)}</p>
                  </div>
                  <p className="text-lg font-semibold text-[#2f2417]">{order.total_amount.toFixed(2)} DH</p>
                </div>

                <ul className="mt-4 space-y-2">
                  {(order.items ?? []).map((item, index) => (
                    <li
                      key={`${order.id}-${item.item_id ?? index}`}
                      className="flex items-center justify-between rounded-xl border border-[#e9dfbf] bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-[#2f2417]">
                        {item.quantity}× {typeof item.name === 'string' ? item.name : ''}
                      </span>
                      <span className="text-[#6f5b3a]">{(item.unit_price * item.quantity).toFixed(2)} DH</span>
                    </li>
                  ))}
                </ul>

                {notes ? (
                  <div className="mt-4 rounded-xl border border-[#d6a24a]/40 bg-[#fff6df] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a5f1d]">ملاحظات الزبون</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#4a3723]">{notes}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.next}
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => updateStatus(order.id, action.next)}
                      className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {updatingId === order.id ? '...' : action.label}
                    </button>
                  ))}
                  {order.status !== 'cancelled' && order.status !== 'served' ? (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-60"
                    >
                      إلغاء
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
