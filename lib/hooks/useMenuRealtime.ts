'use client';

import { useEffect, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type RealtimeHandlers = {
  tableId: number;
  onMenuItemsChange: () => void;
  onCategoriesChange: () => void;
  onTableStatusChange?: (status: string | null) => void;
  onOrderStatusChange?: (payload: { orderId: number; status: string }) => void;
  onWaiterCallAcknowledged?: (payload: { callId: number; status: string }) => void;
};

const DEBOUNCE_MS = 250;

function debounce(fn: () => void, waitMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, waitMs);
  };
}

export function useMenuRealtime(handlers: RealtimeHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const client = supabase;
    const { tableId } = handlersRef.current;

    const refreshMenu = debounce(() => handlersRef.current.onMenuItemsChange(), DEBOUNCE_MS);
    const refreshCategories = debounce(() => handlersRef.current.onCategoriesChange(), DEBOUNCE_MS);

    // Separate channels per logical feature: a subscription the database cannot
    // serve (e.g. a table missing from the realtime publication) must not stop
    // delivery on the other channel.
    const channel = client
      .channel(`customer-menu-${tableId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, refreshMenu)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, refreshCategories)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${tableId}` },
        (payload) => {
          const status = (payload.new as { status?: string | null })?.status ?? null;
          handlersRef.current.onTableStatusChange?.(status);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `table_id=eq.${tableId}` },
        (payload) => {
          const row = payload.new as { id?: number; status?: string };
          if (row?.id && row?.status) {
            handlersRef.current.onOrderStatusChange?.({ orderId: row.id, status: row.status });
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          refreshMenu();
          refreshCategories();
        }
      });

    const callsChannel = client
      .channel(`customer-menu-${tableId}-calls`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'waiter_calls', filter: `table_id=eq.${tableId}` },
        (payload) => {
          const row = payload.new as { id?: number; status?: string };
          if (row?.id && row?.status) {
            handlersRef.current.onWaiterCallAcknowledged?.({ callId: row.id, status: row.status });
          }
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
      client.removeChannel(callsChannel);
    };
  }, [handlers.tableId]);
}
