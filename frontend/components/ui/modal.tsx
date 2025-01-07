import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { Cross1Icon } from '@radix-ui/react-icons';
import Button from '@/components/ui/button';

export default function Modal({
  open = false,
  setOpen = () => {},
  children,
  onClose = () => {},
  title,
  hint,
  canClose = true,
  showCloseButton = true,
  className,
  handleSubmit = () => {},
  submitText = 'Submit',
  cancelText = 'Cancel',
}: {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  children?: React.ReactNode;
  onClose?: () => void;
  title?: string;
  hint?: React.ReactNode;
  canClose?: boolean;
  showCloseButton?: boolean;
  className?: string;
  handleSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
}) {
  const handleClose = () => {
    onClose();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={canClose ? () => handleClose() : () => {}}
      className="relative z-50"
    >
      <DialogBackdrop
        className="fixed inset-0 bg-black/40"
        onClick={canClose ? handleClose : () => {}}
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center">
        <DialogPanel
          className={`flex flex-col rounded-md border border-stroke-weak bg-background ${className}`}
        >
          {hint && hint}
          {title ? (
            <div className="flex justify-between border-b border-stroke-weak p-4">
              <h3 className="text-lg font-bold text-typography-strong">
                {title}
              </h3>
              {canClose && showCloseButton && (
                <Button
                  handleClick={handleClose}
                  className="transition-effect hover:opacity-80"
                  variant="unstyled"
                >
                  <Cross1Icon />
                </Button>
              )}
            </div>
          ) : null}

          <div className="p-6">{children}</div>

          {(handleSubmit || cancelText) && (
            <div className="border-t border-stroke-weak p-4">
              <div className="flex justify-end gap-3">
                {cancelText && (
                  <Button
                    variant="unstyled"
                    className="btn btn-outline btn-small"
                    handleClick={handleClose}
                  >
                    Keep account
                  </Button>
                )}
                {handleSubmit && (
                  <Button
                    className="btn btn-small btn-brand-secondary"
                    variant="unstyled"
                    handleClick={handleSubmit}
                  >
                    Continue with deletion
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
