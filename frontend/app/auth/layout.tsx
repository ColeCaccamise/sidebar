import { Suspense } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <div className="mx-auto flex h-full w-full max-w-[420px] flex-grow flex-col items-start justify-between gap-12 px-6 py-8 md:px-0">
        <Logo />
        <>{children}</>
        <div className="flex gap-1">
          <p>Need help?</p>
          <p>
            <Link
              className="no-underline"
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </Suspense>
  );
}
