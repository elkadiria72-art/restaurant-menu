import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await supabase.from('menu_items').select('category');

  if (error) {
    console.error('Failed to load categories', error);
    return NextResponse.json([], { status: 200 });
  }

  const cats = Array.from(new Set((data || []).map((row: any) => row.category).filter(Boolean)));

  return NextResponse.json(cats);
}
