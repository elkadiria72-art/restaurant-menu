const NOTE_MAX_LENGTH = 500;

export function sanitizeCustomerNotes(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, NOTE_MAX_LENGTH);
}

export { NOTE_MAX_LENGTH };
