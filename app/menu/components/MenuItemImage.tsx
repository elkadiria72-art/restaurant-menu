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
        className="flex h-full w-full items-center justify-center bg-[#EFE6D8]"
        aria-hidden="true"
      >
        <UtensilsCrossed className="text-[#C89F5C]" size={26} strokeWidth={1.5} />
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
      className="h-full w-full object-cover"
    />
  );
}
