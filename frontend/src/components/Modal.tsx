/**
 * Modal.tsx
 * Janela modal usada por todos os formulários de criação/edição.
 * - No celular ocupa a tela inteira; a partir de "sm" vira um card centralizado.
 * - Fecha com ESC ou clicando fora; trava a rolagem da página enquanto aberto.
 */
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Botões fixos no rodapé. */
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

const widths = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative flex h-full w-full animate-scale-in flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:shadow-lift ${widths[size]}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button onClick={onClose} className="-mr-2 rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <footer className="pb-safe flex flex-col-reverse gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:rounded-b-2xl sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
