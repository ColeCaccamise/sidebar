'use client';

import { Workspace, User } from '@/types';
import { ChevronLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface OnboardingActionsProps {
  workspace?: Workspace;
  user: User;
  handleLogout: () => void;
}

export default function OnboardingActions({
  workspace,
  user,
  handleLogout,
}: OnboardingActionsProps) {
  const router = useRouter();
  console.log('workspace', workspace);
  console.log('user', user);

  return (
    <>
      {workspace && user?.onboarded && (
        <div className="fixed left-8 top-8">
          <Button
            className="transition-effect flex items-center gap-1 hover:opacity-90"
            variant="ghost"
            type="submit"
            onClick={() => router.push(`/${user?.default_team_slug}`)}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to dashboard
          </Button>
        </div>
      )}

      <div className="fixed right-8 top-8">
        <Button
          variant="ghost"
          className="btn btn-brand-secondary"
          onClick={() => router.push(`/${user?.default_team_slug}`)}
        >
          Skip
        </Button>
        <Button
          variant="ghost"
          className="btn btn-brand"
          onClick={handleLogout}
        >
          Log out
        </Button>
      </div>
    </>
  );
}
