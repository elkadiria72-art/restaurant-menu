export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f4ebdc_0%,_#fffaf2_42%,_#efe0c0_100%)] p-6">
      <div className="mx-auto max-w-md rounded-[28px] border border-[#b08b4d]/30 bg-[#fcf7ef] p-8 text-center shadow-[0_30px_90px_-35px_rgba(101,70,27,0.45)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f5e4c4] text-2xl">📱</div>
        <h1 className="text-xl font-semibold text-[#2f2417]">Ouasis Restaurant</h1>
        <p className="mt-3 text-sm leading-6 text-[#6f5b3a]">
          Scan the QR code on your table to open the menu and place your order.
        </p>
      </div>
    </main>
  );
}
