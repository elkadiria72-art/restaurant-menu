import { NextResponse } from 'next/server';
import { resolveMenuImageUrl } from '@/lib/menuImages';
import { supabase } from '@/lib/supabase';
import type { MenuItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, price, category, image_url, is_available')
    .order('name', { ascending: true });

  if (error) {
    console.error('menu-items fetch error', error);
    return NextResponse.json({ error: 'Could not load menu items' }, { status: 500 });
  }

  const items = ((data ?? []) as MenuItem[]).map((item) => ({
    ...item,
    description: item.description ?? null,
    image_url: resolveMenuImageUrl(item.image_url) ?? item.image_url,
  }));

  return NextResponse.json(items);
}
