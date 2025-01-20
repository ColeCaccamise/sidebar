import { DashboardIcon } from '@radix-ui/react-icons';

export default function Logo({ className }: { className?: string }) {
  return <DashboardIcon className={className || 'h-8 w-8'} />;
}
