import Link from 'next/link';
import { getCurrentWorkspace } from '@/lib/workspace';
import LogoutButton from '@/components/logout-button';

export default async function NotFound() {
  const { workspace, success } = await getCurrentWorkspace();
  let homeUrl = '/';
  if (success && workspace?.slug) {
    homeUrl = `/${workspace.slug}`;
  }

  return (
    <>
      <div className="absolute right-4 top-4">
        <LogoutButton />
      </div>
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold">Workspace Not Found</h1>

        <p className="text-base font-semibold">
          We couldn&apos;t find the page you were looking for.
        </p>
        <div className="flex gap-4">
          <Link className="btn btn-brand-secondary no-underline" href={homeUrl}>
            Go home
          </Link>
        </div>
      </div>
    </>
  );
}
