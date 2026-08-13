import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) {
    return NextResponse.json([], { status: 200 });
  }

  const [{ data: categories, error: catError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('menu_items').select('category_id, category').eq('is_available', true),
  ]);

  if (catError) {
    console.error('categories fetch error', catError);
  }
  if (itemsError) {
    console.error('menu_items category lookup error', itemsError);
  }

  const availableItems = items ?? [];

  if (categories?.length) {
    const activeCategoryIds = new Set(
      availableItems.map((row) => row.category_id).filter((id): id is number => id != null),
    );
    const activeCategoryNames = new Set(
      availableItems.map((row) => row.category?.trim().toLowerCase()).filter(Boolean) as string[],
    );

    const withItems = categories.filter((cat) => {
      if (activeCategoryIds.has(cat.id)) return true;
      return activeCategoryNames.has(cat.name.trim().toLowerCase());
    });

    return NextResponse.json(withItems as Category[]);
  }

  // No rows in categories table — derive labels from available menu_items only (still from DB).
  const seen = new Set<string>();
  const derived: Category[] = [];

  availableItems.forEach((row, index) => {
    const name = row.category?.trim();
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    derived.push({
      id: row.category_id ?? -(index + 1),
      name,
      sort_order: index,
      is_active: true,
    });
  });

  return NextResponse.json(derived);
}
