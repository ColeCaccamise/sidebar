export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4 pb-8">
      <div className="flex h-full w-full flex-col gap-4">{children}</div>
    </div>
  );
}
