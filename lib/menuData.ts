import type { Category, MenuItem } from '@/lib/types';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ')
    .trim();

export function itemMatchesCategory(item: MenuItem, category: Category): boolean {
  if (item.category_id != null && item.category_id === category.id) return true;
  if (item.category && category.name && normalize(item.category) === normalize(category.name)) return true;
  return false;
}

/** Keep only categories that have at least one available menu item in the database. */
export function categoriesWithItems(categories: Category[], menuItems: MenuItem[]): Category[] {
  return categories.filter((cat) => menuItems.some((item) => itemMatchesCategory(item, cat)));
}
