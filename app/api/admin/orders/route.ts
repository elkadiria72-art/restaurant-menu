import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ORDER_STATUSES = new Set(['pending', 'preparing', 'ready', 'completed', 'cancelled']);

export async function GET() {
  if (!supabase) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, table_id, table_number, items, total_price, status, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('admin orders fetch error', error);
    return NextResponse.json({ error: 'Could not load orders' }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as OrderRecord[]);
}

export async function PATCH(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  let body: { id?: number; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status || !ORDER_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid order update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .single();

  if (error) {
    console.error('admin order update error', error);
    return NextResponse.json({ error: 'Could not update order' }, { status: 500 });
  }

  return NextResponse.json({ success: true, order: data });
}
