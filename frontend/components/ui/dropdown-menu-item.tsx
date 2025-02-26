import Link from 'next/link';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from './tooltip';

export default function DropdownMenuItem({
  icon,
  label,
  href,
  kbd,
  handleClick,
  disabled,
  destructive,
  tooltip,
}: {
  icon?: undefined | null | React.ReactNode;
  label?: string;
  href?: string;
  kbd?: string;
  handleClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  tooltip?: string;
}) {
  const iconStyles = 'ml-auto font-sans text-xs text-typography-weak ';
  const buttonStyles = `flex items-center gap-3 w-full p-2 rounded-md data-[focus]:bg-fill no-underline text-sm ${
    disabled
      ? 'cursor-not-allowed opacity-50'
      : destructive
        ? 'cursor-pointer hover:bg-hover text-error hover:text-error'
        : 'cursor-pointer hover:bg-hover text-typography-weak hover:text-typography-strong'
  }`;

  const content = (
    <>
      {icon}
      <span className="text-inherit">{label}</span>
      {kbd && <kbd className={iconStyles}>{kbd}</kbd>}
    </>
  );

  const wrappedContent = tooltip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {href && !disabled ? (
            <Link href={href} className={buttonStyles}>
              {content}
            </Link>
          ) : (
            <button
              className={buttonStyles}
              onClick={disabled ? undefined : handleClick}
              disabled={disabled}
            >
              {content}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : href && !disabled ? (
    <Link href={href} className={buttonStyles}>
      {content}
    </Link>
  ) : (
    <button
      className={buttonStyles}
      onClick={disabled ? undefined : handleClick}
      disabled={disabled}
    >
      {content}
    </button>
  );

  return wrappedContent;
}
