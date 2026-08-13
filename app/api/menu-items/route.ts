import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { MenuItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, description, price, category_id, category, image_url, is_available')
    .eq('is_available', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('menu-items fetch error', error);
    return NextResponse.json({ error: 'Could not load menu items' }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as MenuItem[]);
}
