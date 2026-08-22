export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-[#EDE3D0] bg-white p-8 text-center shadow-[0_2px_8px_rgba(41,37,33,0.05)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EFE6D8] text-2xl">📱</div>
        <h1 className="font-display text-xl font-semibold text-[#292521]">Ouasis Restaurant</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Scan the QR code on your table to open the menu and place your order.
        </p>
      </div>
    </main>
  );
}
