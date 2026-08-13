import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeQrToken, requireActiveTableFromToken } from '@/lib/validateTable';
import type { WaiterRequestType } from '@/lib/types';

const MESSAGE_MAP: Record<WaiterRequestType, Record<string, string>> = {
  bill: { ar: 'طلب الحساب', en: 'Bill request', fr: 'Demande d\'addition' },
  help: { ar: 'استدعاء النادل', en: 'Waiter call', fr: 'Appel serveur' },
};

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  let body: {
    qr_token?: string;
    request_type?: WaiterRequestType;
    language?: string;
    table_id?: number;
    table_number?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { qr_token, request_type, language = 'ar' } = body;

  if (body.table_id != null || body.table_number != null) {
    return NextResponse.json({ error: 'Table must be identified by qr_token only' }, { status: 400 });
  }

  const token = normalizeQrToken(qr_token);
  if (!token) {
    return NextResponse.json({ error: 'Missing table token' }, { status: 401 });
  }

  if (request_type !== 'bill' && request_type !== 'help') {
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
  }

  let table;
  try {
    table = await requireActiveTableFromToken(token);
  } catch (err) {
    const message = err instanceof Error && err.message === 'TABLE_BLOCKED' ? 'Table unavailable' : 'Invalid table token';
    const status = err instanceof Error && err.message === 'TABLE_BLOCKED' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  const lang = language === 'en' || language === 'fr' ? language : 'ar';
  const message = MESSAGE_MAP[request_type][lang] ?? MESSAGE_MAP[request_type].ar;

  const { data: call, error: insertError } = await supabase
    .from('waiter_calls')
    .insert({
      table_id: table.table_id,
      table_number: table.table_number,
      request_type,
      message,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('waiter_calls insert error', insertError);
    return NextResponse.json({ error: 'Could not send request' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    call_id: call?.id,
    table_id: table.table_id,
    table_number: table.table_number,
  });
}
