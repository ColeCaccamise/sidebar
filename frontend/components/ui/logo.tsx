import { DashboardIcon } from '@radix-ui/react-icons';

export default function Logo({ className }: { className?: string }) {
  return (
    <span className="py-4">
      <DashboardIcon className={className || 'h-8 w-8'} />
    </span>
  );
}
