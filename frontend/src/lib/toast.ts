import { toast } from 'sonner';

export const showError = (message: string) => {
  toast.error(message, {
    duration: 4000,
    dismissible: true,
  });
};

export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    dismissible: true,
  });
};

export const showInfo = (message: string) => {
  toast.info(message, {
    duration: 3000,
  });
};

export const showWarning = (message: string) => {
  toast.warning(message, {
    duration: 4000,
  });
};