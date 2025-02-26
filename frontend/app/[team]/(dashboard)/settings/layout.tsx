export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 pb-8">
      <div className="flex h-full w-full max-w-5xl flex-col gap-12">
        {children}
      </div>
    </div>
  );
}
