'use client';

import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { resolveMenuImageUrl } from '@/lib/menuImages';

type Props = {
  src?: string | null;
  alt: string;
};

export default function MenuItemImage({ src, alt }: Props) {
  const resolved = resolveMenuImageUrl(src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return (
      <div
        className="mb-3 flex h-32 w-full items-center justify-center rounded-[16px] border border-dashed border-[#b08b4d]/25 bg-[#f5ebda]/80 sm:h-40 sm:rounded-[18px]"
        aria-hidden="true"
      >
        <UtensilsCrossed className="text-[#b08b4d]/45" size={36} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="mb-3 h-32 w-full rounded-[16px] object-cover sm:h-40 sm:rounded-[18px]"
    />
  );
}
