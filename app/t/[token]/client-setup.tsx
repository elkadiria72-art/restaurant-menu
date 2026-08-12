'use client';

import { useEffect } from 'react';
import MenuPage from '../../menu/page';

type Props = {
  tableId: number;
  tableNumber: number;
  qrToken: string;
};

export default function ClientSetup({ tableId, tableNumber, qrToken }: Props) {
  useEffect(() => {
    try {
      localStorage.setItem('elk_table', JSON.stringify({ table_id: tableId, table_number: tableNumber, qr_token: qrToken }));
    } catch (e) {
      // ignore
    }
  }, [tableId, tableNumber, qrToken]);

  return <MenuPage />;
}
