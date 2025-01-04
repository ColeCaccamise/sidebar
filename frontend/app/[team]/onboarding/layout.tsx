export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-8 md:px-8">
      {children}
    </div>
  );
}
