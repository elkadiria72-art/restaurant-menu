const MENU_IMAGES_BUCKET = 'menu-images';

/** Resolve a menu item image to a public Supabase Storage URL (or pass through full URLs). */
export function resolveMenuImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl?.trim()) return null;

  const trimmed = imageUrl.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!supabaseUrl) return null;

  let objectPath = trimmed.replace(/^\/+/, '');

  if (objectPath.startsWith(`${MENU_IMAGES_BUCKET}/`)) {
    objectPath = objectPath.slice(MENU_IMAGES_BUCKET.length + 1);
  }

  if (!objectPath) return null;

  return `${supabaseUrl}/storage/v1/object/public/${MENU_IMAGES_BUCKET}/${encodeURI(objectPath)}`;
}
