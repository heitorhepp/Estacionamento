/**
 * ExitModal.tsx
 * Registro de saída em dois passos (regra 8):
 * 1. Ao abrir, busca a PRÉ-VISUALIZAÇÃO calculada pelo back-end (nada é gravado).
 * 2. O operador escolhe a forma de pagamento e CONFIRMA; o back-end recalcula e grava.
 * O valor exibido nunca é enviado de volta: o front não decide preço.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Banknote, BadgeCheck, CreditCard, QrCode, RefreshCw } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { movementService } from '../services/movement.service';
import type { PaymentMethod } from '../types';
import { getErrorMessage } from '../utils/errors';
import { formatCurrency, formatDateTime, formatDuration } from '../utils/format';
import { Button } from './Button';
import { Segmented } from './FormFields';
import { Modal } from './Modal';
import { PlateBadge } from './PlateBadge';
import { Skeleton } from './Skeleton';

interface ExitModalProps {
  movementId: string | null;
  onClose: () => void;
  /** Chamado após a saída confirmada (para recarregar a lista/mapa). */
  onDone: () => void;
}

type PaidMethod = Exclude<PaymentMethod, 'MENSALISTA'>;

const paymentOptions: Array<{ value: PaidMethod; label: string; icon: React.ReactNode }> = [
  { value: 'PIX', label: 'PIX', icon: <QrCode className="h-4 w-4" /> },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: <Banknote className="h-4 w-4" /> },
  { value: 'CARTAO', label: 'Cartão', icon: <CreditCard className="h-4 w-4" /> },
];

export function ExitModal({ movementId, onClose, onDone }: ExitModalProps) {
  const [method, setMethod] = useState<PaidMethod>('PIX');
  const [saving, setSaving] = useState(false);
  const { data: preview, loading, error, reload } = useAsync(
    () => (movementId ? movementService.previewExit(movementId) : Promise.resolve(null)),
    [movementId],
  );

  const needsPayment = Boolean(preview && preview.valorCobrado > 0);

  async function confirm() {
    if (!movementId) return;
    setSaving(true);
    try {
      await movementService.confirmExit(movementId, needsPayment ? method : undefined);
      toast.success(`Saída de ${preview?.placa} registrada. Vaga liberada!`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(movementId)}
      onClose={onClose}
      title="Registrar saída"
      description="Confira o valor calculado antes de confirmar."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button variant="success" onClick={confirm} loading={saving} disabled={!preview} icon={<BadgeCheck className="h-4 w-4" />}>
            Confirmar saída
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-20" />
        </div>
      ) : error || !preview ? (
        <p className="rounded-xl bg-occupied-50 p-4 text-sm text-occupied-700">{error ?? 'Não foi possível calcular a saída.'}</p>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <PlateBadge plate={preview.placa} size="lg" />
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold">Vaga {preview.vaga}</span>
            </div>
            <p className="mt-5 text-sm text-ink-300">Valor a cobrar</p>
            <div className="flex items-end justify-between gap-3">
              <p className="text-4xl font-extrabold tracking-tight">{formatCurrency(preview.valorCobrado)}</p>
              <button onClick={() => reload()} className="mb-1 inline-flex items-center gap-1 text-xs text-ink-300 hover:text-white">
                <RefreshCw className="h-3.5 w-3.5" /> Recalcular
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-300">Permanência de {formatDuration(preview.minutosPermanencia)}</p>
          </div>

          {preview.observacao && (
            <p
              className={`rounded-xl p-3.5 text-sm font-medium ${
                preview.cobertoPorMensalidade ? 'bg-free-50 text-free-700' : 'bg-overdue-50 text-overdue-700'
              }`}
            >
              {preview.observacao}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-ink-50 p-3">
              <dt className="text-xs text-ink-500">Entrada</dt>
              <dd className="font-semibold text-ink-800">{formatDateTime(preview.dataHoraEntrada)}</dd>
            </div>
            <div className="rounded-xl bg-ink-50 p-3">
              <dt className="text-xs text-ink-500">Saída</dt>
              <dd className="font-semibold text-ink-800">{formatDateTime(preview.dataHoraSaida)}</dd>
            </div>
          </dl>

          <p className="text-xs text-ink-500">
            Tabela da entrada: tolerância {preview.precos.toleranciaMinutos} min · 1ª hora {formatCurrency(preview.precos.primeiraHora)} · hora adicional{' '}
            {formatCurrency(preview.precos.horaAdicional)} · diária {formatCurrency(preview.precos.diaria)}
          </p>

          {needsPayment && <Segmented label="Forma de pagamento" value={method} onChange={setMethod} options={paymentOptions} />}
        </div>
      )}
    </Modal>
  );
}
