import ClientSetup from './client-setup';
import { supabase } from '@/lib/supabase';

type Props = {
  params: {
    token: string;
  };
};

export default async function Page({ params }: Props) {
  const token = params.token;

  if (!supabase) {
    return <div className="p-6">Supabase is not configured.</div>;
  }

  const { data, error } = await supabase.from('tables').select('id,table_number').eq('qr_token', token).limit(1).maybeSingle();

  if (error || !data) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#b08b4d]/20 bg-[#fffaf3] p-6 text-center">
          <h1 className="mb-3 text-xl font-semibold text-[#2f2417]">رمز الطاولة غير صالح</h1>
          <p className="text-sm text-[#6f5b3a]">الرجاء التحقق من رمز QR أو طلب المساعدة من النادل.</p>
        </div>
      </div>
    );
  }

  return <ClientSetup tableId={data.id} tableNumber={data.table_number} qrToken={token} />;
}
