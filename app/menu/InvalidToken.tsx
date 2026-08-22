type Props = {
  reason: 'missing' | 'invalid' | 'inactive';
};

const copy = {
  missing: {
    title: 'رمز الطاولة مطلوب',
    body: 'يرجى مسح رمز QR الموجود على طاولتك للوصول إلى القائمة.',
  },
  invalid: {
    title: 'رمز الطاولة غير صالح',
    body: 'الرجاء التحقق من رمز QR أو طلب المساعدة من النادل.',
  },
  inactive: {
    title: 'الطاولة غير متاحة',
    body: 'هذه الطاولة غير نشطة حالياً. يرجى التواصل مع النادل.',
  },
};

export default function InvalidToken({ reason }: Props) {
  const text = copy[reason];

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-[#EDE3D0] bg-white p-8 text-center shadow-[0_2px_8px_rgba(41,37,33,0.05)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EFE6D8] text-2xl">🍽️</div>
        <h1 className="font-display text-xl font-semibold text-[#292521]">{text.title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">{text.body}</p>
      </div>
    </main>
  );
}
