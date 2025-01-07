import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { ArrowLeftIcon, Cross1Icon } from '@radix-ui/react-icons';
import Button from '@/components/ui/button';

type Step = {
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  handleSubmit?: () => void;
  title?: string;
  disabled?: boolean;
  handleBack?: () => void;
};

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
  steps,
  currentStep = 0,
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
  steps?: Step[];
  currentStep?: number;
  handleSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
}) {
  const handleClose = () => {
    onClose();
    setOpen(false);
  };

  const activeStep = steps?.[currentStep];
  const showContent = !steps ? children : activeStep?.children;
  const showSubmitText = !steps
    ? submitText
    : (activeStep?.submitText ?? submitText);
  const showCancelText = !steps
    ? cancelText
    : (activeStep?.cancelText ?? cancelText);
  const showHandleSubmit = !steps
    ? handleSubmit
    : (activeStep?.handleSubmit ?? handleSubmit);
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
          {(!steps ? title : activeStep?.title) ? (
            <div className="flex justify-between border-b border-stroke-weak p-4">
              {activeStep?.handleBack && (
                <Button handleClick={activeStep.handleBack} variant="unstyled">
                  <ArrowLeftIcon />
                </Button>
              )}
              <h3 className="text-lg font-bold text-typography-strong">
                {!steps ? title : activeStep?.title}
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

          <div className="p-6">{showContent}</div>

          {(!!showHandleSubmit || !!showCancelText) && (
            <div className="border-t border-stroke-weak p-4">
              <div className="flex justify-end gap-3">
                {showCancelText && (
                  <Button
                    variant="unstyled"
                    className="btn btn-outline btn-small"
                    handleClick={handleClose}
                  >
                    {showCancelText}
                  </Button>
                )}
                {showHandleSubmit && (
                  <Button
                    className="btn btn-small btn-brand-secondary"
                    variant="unstyled"
                    handleClick={showHandleSubmit}
                    disabled={activeStep?.disabled}
                  >
                    {showSubmitText}
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
