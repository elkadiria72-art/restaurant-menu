import AdminQRGrid from './AdminQRGrid';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;

export default async function Page() {
  if (!supabase) {
    return <div className="p-6">Supabase is not configured.</div>;
  }

  const { data, error } = await supabase.from('tables').select('id,table_number,qr_token,status').order('table_number', { ascending: true });

  const tables = Array.isArray(data) ? data : [];

  return <AdminQRGrid tables={tables} />;
}
