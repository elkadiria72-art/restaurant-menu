import { supabase } from '@/lib/supabase';
import type { TableSession } from '@/lib/types';

const TOKEN_MIN_LENGTH = 8;

/** Table statuses that block customer ordering and waiter requests. */
export const BLOCKED_TABLE_STATUSES = new Set(['inactive', 'closed']);

export function normalizeQrToken(token: string | null | undefined): string | null {
  const trimmed = token?.trim();
  if (!trimmed || trimmed.length < TOKEN_MIN_LENGTH) return null;
  return trimmed;
}

export function isTableBlocked(status: string | null | undefined): boolean {
  if (!status) return false;
  return BLOCKED_TABLE_STATUSES.has(status.toLowerCase());
}

export async function validateTableToken(token: string): Promise<TableSession | null> {
  const normalized = normalizeQrToken(token);
  if (!normalized || !supabase) return null;

  const { data, error } = await supabase
    .from('tables')
    .select('id, table_number, qr_token, status')
    .eq('qr_token', normalized)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // Reject if stored token does not exactly match (defense against partial/case drift)
  if (data.qr_token !== normalized) return null;

  return {
    table_id: data.id,
    table_number: data.table_number,
    qr_token: data.qr_token,
    status: data.status ?? null,
  };
}

export async function requireTableFromToken(token: string): Promise<TableSession> {
  const table = await validateTableToken(token);
  if (!table) {
    throw new Error('INVALID_TABLE_TOKEN');
  }
  return table;
}

export async function requireActiveTableFromToken(token: string): Promise<TableSession> {
  const table = await requireTableFromToken(token);
  if (isTableBlocked(table.status)) {
    throw new Error('TABLE_BLOCKED');
  }
  return table;
}
