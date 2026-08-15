import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeCustomerNotes } from '@/lib/orderNotes';
import { normalizeQrToken, requireActiveTableFromToken } from '@/lib/validateTable';
type OrderItemInput = {
  item_id: number;
  quantity: number;
};

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  let body: {
    qr_token?: string;
    items?: OrderItemInput[];
    table_id?: number;
    table_number?: number;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { qr_token, items } = body;
  const notes = sanitizeCustomerNotes(body.notes);

  if (body.table_id != null || body.table_number != null) {
    return NextResponse.json({ error: 'Table must be identified by qr_token only' }, { status: 400 });
  }

  const token = normalizeQrToken(qr_token);
  if (!token) {
    return NextResponse.json({ error: 'Missing table token' }, { status: 401 });
  }

  if (!items?.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  let table;
  try {
    table = await requireActiveTableFromToken(token);
  } catch (err) {
    const message = err instanceof Error && err.message === 'TABLE_BLOCKED' ? 'Table unavailable' : 'Invalid table token';
    const status = err instanceof Error && err.message === 'TABLE_BLOCKED' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  const itemIds = items.map((entry) => entry.item_id);
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, price, is_available')
    .in('id', itemIds)
    .eq('is_available', true);

  if (menuError || !menuItems?.length) {
    return NextResponse.json({ error: 'Menu items could not be verified' }, { status: 400 });
  }

  const priceMap = new Map(menuItems.map((row) => [row.id, row]));
  const itemsPayload = [];
  let totalPrice = 0;

  for (const entry of items) {
    if (!entry.quantity || entry.quantity < 1) continue;
    const menuItem = priceMap.get(entry.item_id);
    if (!menuItem) {
      return NextResponse.json({ error: `Item ${entry.item_id} is unavailable` }, { status: 400 });
    }
    const lineTotal = menuItem.price * entry.quantity;
    totalPrice += lineTotal;
    itemsPayload.push({
      item_id: menuItem.id,
      quantity: entry.quantity,
      unit_price: menuItem.price,
      name: menuItem.name,
    });
  }

  if (!itemsPayload.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  const { data: order, error: insertError } = await supabase
    .from('orders')
    .insert({
      items: itemsPayload,
      total_amount: totalPrice,
      table_id: table.table_id,
      table_number: table.table_number,
      status: 'new',
      ...(notes ? { notes } : {}),
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('orders insert error', insertError);
    return NextResponse.json({ error: 'Could not place order' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    order_id: order?.id,
    table_id: table.table_id,
    table_number: table.table_number,
  });
}
