/**
 * Precos.tsx
 * Tabela de preços por tipo de veículo (ADMIN). Edição em modal, com um exemplo
 * calculado ao vivo para facilitar a conferência. Mudanças valem só para novas entradas.
 */
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Bike, Car, Info, Pencil } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/FormFields';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { priceService } from '../../services/price.service';
import type { Price, VehicleType } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { VEHICLE_TYPE_LABEL, formatCurrency } from '../../utils/format';

const TYPES: VehicleType[] = ['CARRO', 'MOTO'];
const emptyForm = { toleranciaMinutos: '15', valorPrimeiraHora: '', valorHoraAdicional: '', valorDiaria: '' };

export function Precos() {
  const { data: prices, loading, reload } = useAsync(priceService.list, []);
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm(emptyForm);

  function openForm(type: VehicleType, price?: Price) {
    setEditing(type);
    form.reset(
      price
        ? {
            toleranciaMinutos: String(price.toleranciaMinutos),
            valorPrimeiraHora: price.valorPrimeiraHora,
            valorHoraAdicional: price.valorHoraAdicional,
            valorDiaria: price.valorDiaria,
          }
        : emptyForm,
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const v = form.values;
    const e: Record<string, string> = {};
    if (!(Number(v.toleranciaMinutos) >= 0) || v.toleranciaMinutos === '') e.toleranciaMinutos = 'Informe a tolerância em minutos.';
    if (!(Number(v.valorPrimeiraHora) >= 0) || v.valorPrimeiraHora === '') e.valorPrimeiraHora = 'Informe o valor.';
    if (!(Number(v.valorHoraAdicional) >= 0) || v.valorHoraAdicional === '') e.valorHoraAdicional = 'Informe o valor.';
    if (!(Number(v.valorDiaria) >= Number(v.valorPrimeiraHora))) e.valorDiaria = 'A diária não pode ser menor que a primeira hora.';
    if (Object.keys(e).length) return form.setErrors(e);

    setBusy(true);
    try {
      await priceService.save(editing, {
        toleranciaMinutos: Number(v.toleranciaMinutos),
        valorPrimeiraHora: Number(v.valorPrimeiraHora),
        valorHoraAdicional: Number(v.valorHoraAdicional),
        valorDiaria: Number(v.valorDiaria),
      });
      toast.success(`Tabela de ${VEHICLE_TYPE_LABEL[editing].toLowerCase()} salva.`);
      setEditing(null);
      reload(true);
    } catch (err) {
      form.setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Exemplo ao vivo: 3h10 de permanência (= 4 horas cobradas), limitado à diária.
  const example = Math.min(Number(form.values.valorPrimeiraHora || 0) + 3 * Number(form.values.valorHoraAdicional || 0), Number(form.values.valorDiaria || 0));

  return (
    <>
      <PageHeader title="Tabela de preços" subtitle="Valores cobrados de clientes avulsos por tipo de veículo." />

      <p className="mb-6 flex items-start gap-2 rounded-xl bg-brand-50 p-3.5 text-sm text-brand-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Alterações valem apenas para novas entradas. Veículos que já estão no pátio pagam pela tabela vigente no momento em que entraram.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {TYPES.map((type) => {
          const price = prices?.find((p) => p.tipoVeiculo === type);
          const Icon = type === 'CARRO' ? Car : Bike;
          return loading ? (
            <Skeleton key={type} className="h-72" />
          ) : (
            <Card key={type} className="overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-ink-900 to-ink-800 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="text-lg font-bold">{VEHICLE_TYPE_LABEL[type]}</h2>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openForm(type, price)} icon={<Pencil className="h-4 w-4" />}>
                  {price ? 'Editar' : 'Configurar'}
                </Button>
              </div>
              {price ? (
                <dl className="divide-y divide-ink-100">
                  {[
                    ['Tolerância', `${price.toleranciaMinutos} minutos grátis`],
                    ['Primeira hora', formatCurrency(price.valorPrimeiraHora)],
                    ['Hora adicional', formatCurrency(price.valorHoraAdicional)],
                    ['Diária (teto por 24h)', formatCurrency(price.valorDiaria)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-5 py-3.5 text-sm">
                      <dt className="text-ink-500">{label}</dt>
                      <dd className="text-base font-bold text-ink-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-ink-500">Sem tabela configurada: não é possível registrar entradas deste tipo.</p>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Preços — ${editing ? VEHICLE_TYPE_LABEL[editing] : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="price-form" loading={busy}>
              Salvar tabela
            </Button>
          </>
        }
      >
        <form id="price-form" onSubmit={handleSave} noValidate className="space-y-4">
          <Input label="Tolerância (minutos)" type="number" min="0" inputMode="numeric" value={form.values.toleranciaMinutos} onChange={(e) => form.setField('toleranciaMinutos', e.target.value)} error={form.errors.toleranciaMinutos} hint="Até esse tempo, a saída é gratuita." />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="1ª hora (R$)" type="number" min="0" step="0.01" inputMode="decimal" value={form.values.valorPrimeiraHora} onChange={(e) => form.setField('valorPrimeiraHora', e.target.value)} error={form.errors.valorPrimeiraHora} />
            <Input label="Hora adicional (R$)" type="number" min="0" step="0.01" inputMode="decimal" value={form.values.valorHoraAdicional} onChange={(e) => form.setField('valorHoraAdicional', e.target.value)} error={form.errors.valorHoraAdicional} />
            <Input label="Diária (R$)" type="number" min="0" step="0.01" inputMode="decimal" value={form.values.valorDiaria} onChange={(e) => form.setField('valorDiaria', e.target.value)} error={form.errors.valorDiaria} />
          </div>
          <p className="rounded-xl bg-ink-50 p-3.5 text-sm text-ink-600">
            Exemplo: quem ficar <strong>3h10</strong> paga 4 horas = <strong className="text-ink-900">{formatCurrency(example)}</strong>
            <span className="block text-xs text-ink-500">Cada hora iniciada conta inteira; cada período de 24h é limitado à diária.</span>
          </p>
        </form>
      </Modal>
    </>
  );
}
