import MenuClient from './MenuClient';
import InvalidToken from './InvalidToken';
import { isTableBlocked, normalizeQrToken, validateTableToken } from '@/lib/validateTable';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: {
    token?: string;
  };
};

export default async function MenuPage({ searchParams }: Props) {
  const token = normalizeQrToken(searchParams.token);

  if (!token) {
    return <InvalidToken reason="missing" />;
  }

  const table = await validateTableToken(token);

  if (!table) {
    return <InvalidToken reason="invalid" />;
  }

  if (isTableBlocked(table.status)) {
    return <InvalidToken reason="inactive" />;
  }

  return <MenuClient table={table} />;
}
