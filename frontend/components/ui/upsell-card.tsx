'use client';

import Link from 'next/link';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function UpsellCard({
  title,
  description,
  buttonText,
  buttonLink,
  closeable = false,
}: {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  closeable?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative flex flex-col items-center justify-between gap-4 rounded-md border border-stroke-weak bg-accent p-3">
      {closeable && (
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-2 text-typography-weak hover:text-typography-strong"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      )}
      <div className="flex flex-col gap-1">
        <span
          className={`text-sm font-medium text-typography-strong ${closeable ? 'pr-6' : ''}`}
        >
          {title}
        </span>
        <span className="text-xs text-typography-weak">{description}</span>
      </div>
      <Link
        href={buttonLink}
        className="btn btn-brand w-full py-2 text-sm no-underline"
      >
        {buttonText}
      </Link>
    </div>
  );
}
