export default function Divider({ className }: { className?: string }) {
  return (
    <div
      className={`h-0.5 w-full bg-stroke-weak opacity-60 ${className}`}
    ></div>
  );
}
