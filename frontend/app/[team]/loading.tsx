import { SkeletonSidebar } from '@/components/ui/sidebar';

export default function LoadingPage() {
  return (
    <div className="flex h-screen max-h-screen w-full flex-grow justify-start overflow-auto bg-background">
      <SkeletonSidebar />
      <div className="flex h-full max-h-screen flex-grow justify-center overflow-y-auto p-8" />
    </div>
  );
}
