import Link from 'next/link';

export default function DropdownMenuItem({
  icon,
  label,
  href,
  kbd,
  handleClick,
  disabled,
  destructive,
}: {
  icon?: undefined | null | React.ReactNode;
  label?: string;
  href?: string;
  kbd?: string;
  handleClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const iconStyles = 'ml-auto font-sans text-xs text-typography-weak ';
  const buttonStyles = `flex items-center gap-3 w-full p-2 rounded-md data-[focus]:bg-fill no-underline text-sm ${
    disabled
      ? 'cursor-not-allowed opacity-50'
      : destructive
        ? 'cursor-pointer hover:bg-hover text-error hover:text-error'
        : 'cursor-pointer hover:bg-hover text-typography-weak hover:text-typography-strong'
  }`;

  if (href && !disabled) {
    return (
      <Link href={href} className={buttonStyles}>
        {icon}
        <span className="text-inherit">{label}</span>
        {kbd && <kbd className={iconStyles}>{kbd}</kbd>}
      </Link>
    );
  } else {
    return (
      <button
        className={buttonStyles}
        onClick={disabled ? undefined : handleClick}
        disabled={disabled}
      >
        {icon}
        <span className="text-inherit">{label}</span>
        {kbd && <kbd className={iconStyles}>{kbd}</kbd>}
      </button>
    );
  }
}
