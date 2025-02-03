import api from '@/lib/api';
import { Identity } from '@/types';
import Link from 'next/link';

export default async function NotFound() {
  const data = await api
    .get<{ data: Identity }>('/auth/identity', {
      withCredentials: true,
    })
    .then((res) => res.data.data)
    .catch(() => null);

  const team = data?.team;
  const homeUrl = team ? `/${team.slug}` : '/';

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <h1 className="text-7xl font-bold">404</h1>

      <p className="text-base font-semibold">
        We couldn&apos;t find the page you were looking for.
      </p>
      <div className="flex gap-4">
        <Link className="btn btn-brand-secondary no-underline" href={homeUrl}>
          Go home
        </Link>
      </div>
    </div>
  );
}
