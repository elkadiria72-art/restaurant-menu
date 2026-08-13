import AdminOrdersBoard from './AdminOrdersBoard';
import { supabase } from '@/lib/supabase';
import type { OrderRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  if (!supabase) {
    return <div className="p-6">Supabase is not configured.</div>;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, table_id, table_number, items, total_price, status, customer_notes, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('admin orders page fetch error', error);
  }

  const orders = (data ?? []) as OrderRecord[];

  return <AdminOrdersBoard initialOrders={orders} />;
}
