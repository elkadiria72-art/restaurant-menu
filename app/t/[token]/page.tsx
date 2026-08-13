import { redirect } from 'next/navigation';
import InvalidToken from '@/app/menu/InvalidToken';
import { isTableBlocked, normalizeQrToken, validateTableToken } from '@/lib/validateTable';

type Props = {
  params: {
    token: string;
  };
};

export default async function TokenRedirectPage({ params }: Props) {
  const token = normalizeQrToken(params.token);

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

  redirect(`/menu?token=${encodeURIComponent(table.qr_token)}`);
}
