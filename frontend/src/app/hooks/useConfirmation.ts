// app/hooks/useConfirmation.ts
import { useState } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
}

export const useConfirmation = () => {
  const [confirmationState, setConfirmationState] = useState<{
    options: ConfirmationOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmationState({ options, resolve });
    });
  };

  const handleConfirm = () => {
    if (confirmationState) {
      confirmationState.resolve(true);
      setConfirmationState(null);
    }
  };

  const handleCancel = () => {
    if (confirmationState) {
      confirmationState.resolve(false);
      setConfirmationState(null);
    }
  };

  return {
    confirm,
    handleConfirm,
    handleCancel,
    isOpen: !!confirmationState,
    options: confirmationState?.options
  };
};