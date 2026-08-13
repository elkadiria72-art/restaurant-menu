import { NextResponse } from 'next/server';
import { normalizeQrToken, validateTableToken } from '@/lib/validateTable';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = normalizeQrToken(searchParams.get('token'));

  if (!token) {
    return NextResponse.json({ error: 'Missing table token' }, { status: 401 });
  }

  const table = await validateTableToken(token);

  if (!table) {
    return NextResponse.json({ error: 'Invalid table token' }, { status: 401 });
  }

  return NextResponse.json({
    table_id: table.table_id,
    table_number: table.table_number,
    qr_token: table.qr_token,
    status: table.status ?? null,
  });
}
