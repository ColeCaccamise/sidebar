import { ForwardedRef, forwardRef, useState } from 'react';
import Button from '@/components/ui/button';
import Link from 'next/link';

const SettingsBox = forwardRef(function SettingsBox(
  {
    variant = 'default',
    title = 'Your Name',
    description,
    note,
    disabled = true,
    onSettingSubmit,
    children,
    submitText = 'Save Changes',
    showSubmitButton = true,
    buttonLink,
  }: {
    variant?: string;
    title?: string;
    description?: string;
    note?: string | JSX.Element;
    disabled?: boolean;
    onSettingSubmit?: () => Promise<void>;
    children?: React.ReactNode;
    submitText?: string;
    showSubmitButton?: boolean;
    buttonLink?: string;
  },
  ref: ForwardedRef<HTMLFormElement>,
) {
  // const { isSubmitting } = useLastSubmit();
  const [disableSubmit, setDisableSubmit] = useState(false);

  return (
    <form
      ref={ref}
      onSubmit={async (e) => {
        e.preventDefault();

        setDisableSubmit(true);

        if (onSettingSubmit) {
          await onSettingSubmit()
            .then(() => {
              setDisableSubmit(false);
            })
            .catch(() => {
              setDisableSubmit(false);
            });
        }
      }}
      className={`flex flex-col border ${
        variant === 'destructive'
          ? 'border-error-stroke-weak'
          : 'border-stroke-weak'
      } w-full max-w-5xl gap-2 rounded-md`}
    >
      <div className="flex flex-col gap-4 px-8 py-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-typography-weak">{description}</p>
          )}
        </div>
        {children}
      </div>

      <div
        className={`flex items-center justify-between gap-8 rounded-b-md px-8 py-6 ${
          variant === 'destructive'
            ? 'border-t border-error-stroke-weak'
            : 'bg-fill'
        }`}
      >
        <div
          className={`text-sm text-typography-weak ${submitText ? 'py-3' : ''}`}
        >
          {note}
        </div>

        {showSubmitButton && (
          <>
            {buttonLink ? (
              <Link className="btn btn-brand no-underline" href={buttonLink}>
                {submitText}
              </Link>
            ) : (
              <Button
                variant={variant === 'destructive' ? 'destructive' : ''}
                type="submit"
                disabled={disabled || disableSubmit}
                loading={disableSubmit}
              >
                {submitText}
              </Button>
            )}
          </>
        )}
      </div>
    </form>
  );
});

export default SettingsBox;
