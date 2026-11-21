/**
 * ConfirmDialog.tsx
 * Confirmação antes de ações destrutivas (excluir, cancelar entrada...).
 */
import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', loading, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-occupied-50 text-occupied-600">
          <TriangleAlert className="h-5 w-5" />
        </div>
        <div className="text-sm leading-relaxed text-ink-600">{message}</div>
      </div>
    </Modal>
  );
}
