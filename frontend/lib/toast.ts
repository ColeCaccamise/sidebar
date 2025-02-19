import { toast as sonner } from 'sonner';

export type ToastMode =
  | 'default'
  | 'success'
  | 'undo'
  | 'error'
  | 'warning'
  | 'info';

export default function toast({
  message,
  mode = 'default',
  description,
  undoAction,
}: {
  message: string;
  mode?: ToastMode;
  description?: string;
  undoAction?: () => void;
}) {
  switch (mode) {
    case 'error': {
      sonner.error(message, {
        className: 'bg-error-fill border-error-stroke-weak text-error',
        description: description,
      });
      break;
    }
    case 'success': {
      sonner.success(message, {
        className: 'bg-success-fill border-success-stroke-weak text-success',
        description: description,
      });
      break;
    }
    case 'undo': {
      sonner.success(message, {
        className: 'bg-success-fill border-success-stroke-weak text-success',
        description: description,
        action: {
          label: 'Undo',
          onClick: () => {
            undoAction?.();
          },
        },
      });
      break;
    }
    case 'warning': {
      sonner.warning(message, {
        className: 'bg-warning-fill border-warning-stroke-weak text-warning',
        description: description,
      });
      break;
    }
    case 'info': {
      sonner.info(message, {
        className: 'bg-info-fill border-info-stroke-weak text-info',
        description: description,
      });
      break;
    }
    default: {
      sonner(message, {
        className: 'bg-fill border-stroke-weak text-typography-strong',
        description: description,
      });
      break;
    }
  }
}

export const dismissAll = () => sonner.dismiss();
