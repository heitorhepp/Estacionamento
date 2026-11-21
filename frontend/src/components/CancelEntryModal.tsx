/**
 * CancelEntryModal.tsx
 * Cancelamento de entrada lançada por engano (regra 9): exige motivo e confirmação,
 * pois a ação não pode ser desfeita. A vaga é liberada e a estadia não entra no faturamento.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban } from 'lucide-react';
import { movementService } from '../services/movement.service';
import { getErrorMessage } from '../utils/errors';
import { formatPlate } from '../utils/format';
import { Button } from './Button';
import { Textarea } from './FormFields';
import { Modal } from './Modal';

interface CancelEntryModalProps {
  movement: { id: string; placa: string } | null;
  onClose: () => void;
  onDone: () => void;
}

export function CancelEntryModal({ movement, onClose, onDone }: CancelEntryModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReason('');
    setError('');
  }, [movement]);

  async function confirm() {
    if (!movement) return;
    if (reason.trim().length < 3) return setError('Informe o motivo do cancelamento.');
    setSaving(true);
    try {
      await movementService.cancel(movement.id, reason.trim());
      toast.success('Entrada cancelada e vaga liberada.');
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
      open={Boolean(movement)}
      onClose={onClose}
      title="Cancelar entrada"
      description={movement ? `Veículo ${formatPlate(movement.placa)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button variant="danger" onClick={confirm} loading={saving} icon={<Ban className="h-4 w-4" />}>
            Cancelar entrada
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-overdue-50 p-3.5 text-sm text-overdue-700">
          Use apenas para entradas lançadas por engano. Esta ação <strong>não pode ser desfeita</strong>: a vaga será liberada e a estadia não
          entrará no faturamento.
        </p>
        <Textarea
          label="Motivo do cancelamento"
          placeholder="Ex.: placa digitada errada, veículo desistiu de entrar..."
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          error={error}
          maxLength={300}
          autoFocus
        />
      </div>
    </Modal>
  );
}
