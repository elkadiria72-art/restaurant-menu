'use client';

import React from 'react';

type Table = {
  id: number;
  table_number: number;
  qr_token: string;
  status?: string | null;
};

export default function AdminQRGrid({ tables }: { tables: Table[] }) {
  const baseUrl = 'https://menu.elkahmed.com/t/';

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2f2417]">قوائم QR للطاولات</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-full bg-[#d6a24a] px-4 py-2 text-sm font-semibold text-[#22170e] shadow-sm"
          >
            طباعة
          </button>
        </div>
      </div>

      <style>{`@media print { button { display: none } .no-print { display: none } }`}</style>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tables.map((t) => {
          const url = `${baseUrl}${encodeURIComponent(t.qr_token)}`;
          const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

          return (
            <div key={t.id} className="rounded-2xl border border-[#b08b4d]/20 bg-[#fffaf3] p-4 text-center">
              <div className="mb-3 text-lg font-semibold text-[#2f2417]">طاولة {t.table_number}</div>
              <img src={qrSrc} alt={`QR ${t.table_number}`} className="mx-auto mb-3 w-[180px]" />
              <div className="break-words text-sm text-[#6f5b3a]">{url}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
