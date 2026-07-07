import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount?: string;
  currency?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  loading?: boolean;
}

const variantStyles = {
  default: {
    icon: 'text-teal-600',
    iconBg: 'bg-teal-50',
    confirmButton: 'bg-teal-600 hover:bg-teal-700',
  },
  destructive: {
    icon: 'text-red-600',
    iconBg: 'bg-red-50',
    confirmButton: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: 'text-amber-600',
    iconBg: 'bg-amber-50',
    confirmButton: 'bg-amber-600 hover:bg-amber-700',
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  amount,
  currency,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
}: ConfirmationDialogProps) {
  const styles = variantStyles[variant];

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-4">
          <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-full", styles.iconBg)}>
            <AlertTriangle className={cn("h-6 w-6", styles.icon)} />
          </div>
          <DialogTitle className="text-center text-lg">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
            {amount && currency && (
              <span className="mt-2 block font-semibold text-stone-900">
                {currency} {amount}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={cn("w-full text-white", styles.confirmButton)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full"
          >
            {cancelLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
