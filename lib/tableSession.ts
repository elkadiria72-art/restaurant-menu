import type { TableSession } from '@/lib/types';
import { normalizeQrToken } from '@/lib/validateTable';

const STORAGE_KEY = 'elk_table';

export function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return normalizeQrToken(new URLSearchParams(window.location.search).get('token'));
}

/** True when the URL carries a valid token that matches the locked table session. */
export function urlTokenMatchesTable(table: TableSession): boolean {
  const urlToken = getTokenFromUrl();
  return Boolean(urlToken && urlToken === table.qr_token);
}

export function saveTableSession(session: TableSession): void {
  if (!urlTokenMatchesTable(session)) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage failures
  }
}

export function readTableSession(expectedToken?: string | null): TableSession | null {
  const token = normalizeQrToken(expectedToken ?? getTokenFromUrl());
  if (!token) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<TableSession>;
    if (!parsed?.table_id || !parsed?.table_number || !parsed?.qr_token) return null;
    if (parsed.qr_token !== token) return null;

    return parsed as TableSession;
  } catch {
    return null;
  }
}

export function clearTableSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Redirect to canonical menu URL for re-validation when the URL token drifts. */
export function redirectToCanonicalMenu(token?: string | null): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeQrToken(token ?? getTokenFromUrl());
  window.location.replace(normalized ? `/menu?token=${encodeURIComponent(normalized)}` : '/menu');
}

/** @deprecated Use urlTokenMatchesTable */
export function sessionMatchesUrlToken(session: TableSession): boolean {
  return urlTokenMatchesTable(session);
}
