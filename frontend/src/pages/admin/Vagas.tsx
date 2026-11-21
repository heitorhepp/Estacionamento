/**
 * Vagas.tsx
 * CRUD de vagas (ADMIN), com filtros por tipo/setor. Vaga ocupada não pode ser
 * desativada nem excluída (o back-end responde 409 e mostramos a mensagem).
 */
import { useMemo, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Bike, Car, Grid3x3, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Input, Segmented, Select, Toggle } from '../../components/FormFields';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { Table, type Column } from '../../components/Table';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { spotService } from '../../services/spot.service';
import type { Spot, VehicleType } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { VEHICLE_TYPE_LABEL } from '../../utils/format';

const statusTone = { LIVRE: 'free', OCUPADA: 'occupied', INATIVA: 'ink' } as const;
const statusLabel = { LIVRE: 'Livre', OCUPADA: 'Ocupada', INATIVA: 'Inativa' } as const;
const emptyForm = { codigo: '', tipo: 'CARRO' as VehicleType, setor: '', ativa: true };

export function Vagas() {
  const [typeFilter, setTypeFilter] = useState<VehicleType | ''>('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [editing, setEditing] = useState<Spot | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Spot | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm(emptyForm);
  const { data: spots, loading, reload } = useAsync(spotService.list, []);

  const sectors = useMemo(() => [...new Set((spots ?? []).map((s) => s.setor))].sort(), [spots]);
  const rows = useMemo(() => (spots ?? []).filter((s) => (!typeFilter || s.tipo === typeFilter) && (!sectorFilter || s.setor === sectorFilter)), [spots, typeFilter, sectorFilter]);

  function openForm(spot: Spot | 'new') {
    setEditing(spot);
    form.reset(spot === 'new' ? emptyForm : { codigo: spot.codigo, tipo: spot.tipo, setor: spot.setor, ativa: spot.ativa });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const e: Record<string, string> = {};
    if (!form.values.codigo.trim()) e.codigo = 'Informe o código (ex.: A01).';
    if (!form.values.setor.trim()) e.setor = 'Informe o setor.';
    if (Object.keys(e).length) return form.setErrors(e);

    setBusy(true);
    try {
      if (editing === 'new') await spotService.create(form.values);
      else if (editing) await spotService.update(editing.id, form.values);
      toast.success(editing === 'new' ? 'Vaga criada.' : 'Vaga atualizada.');
      setEditing(null);
      reload(true);
    } catch (err) {
      form.setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(spot: Spot) {
    try {
      await spotService.update(spot.id, { ativa: !spot.ativa });
      toast.success(spot.ativa ? `Vaga ${spot.codigo} desativada.` : `Vaga ${spot.codigo} ativada.`);
      reload(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await spotService.remove(toDelete.id);
      toast.success('Vaga excluída.');
      setToDelete(null);
      reload(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const actions = (s: Spot) => (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="ghost" onClick={() => toggleActive(s)}>
        {s.ativa ? 'Desativar' : 'Ativar'}
      </Button>
      <Button size="sm" variant="ghost" aria-label="Editar" onClick={() => openForm(s)} icon={<Pencil className="h-4 w-4" />} />
      <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => setToDelete(s)} icon={<Trash2 className="h-4 w-4 text-occupied-600" />} />
    </div>
  );

  const columns: Column<Spot>[] = [
    { header: 'Código', cell: (s) => <span className="font-bold text-ink-900">{s.codigo}</span>, hideOnMobile: true },
    { header: 'Setor', cell: (s) => s.setor },
    {
      header: 'Tipo',
      cell: (s) => (
        <span className="inline-flex items-center gap-1.5">
          {s.tipo === 'CARRO' ? <Car className="h-4 w-4 text-ink-400" /> : <Bike className="h-4 w-4 text-ink-400" />}
          {VEHICLE_TYPE_LABEL[s.tipo]}
        </span>
      ),
    },
    { header: 'Status', cell: (s) => <Badge tone={statusTone[s.status]} dot>{statusLabel[s.status]}</Badge> },
    { header: 'Veículo', cell: (s) => <span className="font-mono text-xs">{s.movimentacaoAtual?.placa ?? '—'}</span> },
    { header: '', cell: actions, hideOnMobile: true, className: 'w-56' },
  ];

  return (
    <>
      <PageHeader
        title="Vagas"
        subtitle={`${spots?.length ?? 0} vagas cadastradas em ${sectors.length} setor(es).`}
        actions={
          <Button onClick={() => openForm('new')} icon={<Plus className="h-4 w-4" />}>
            Nova vaga
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:flex">
        <Select className="sm:w-48" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as VehicleType | '')} aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          <option value="CARRO">Carros</option>
          <option value="MOTO">Motos</option>
        </Select>
        <Select className="sm:w-48" value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} aria-label="Filtrar por setor">
          <option value="">Todos os setores</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              Setor {s}
            </option>
          ))}
        </Select>
      </div>

      <Table
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        loading={loading}
        mobileTitle={(s) => `Vaga ${s.codigo}`}
        mobileActions={actions}
        empty={{ icon: <Grid3x3 className="h-7 w-7" />, title: 'Nenhuma vaga encontrada', action: <Button onClick={() => openForm('new')}>Cadastrar vaga</Button> }}
      />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nova vaga' : `Editar vaga ${editing ? editing.codigo : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="spot-form" loading={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="spot-form" onSubmit={handleSave} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Código" placeholder="A01" value={form.values.codigo} onChange={(e) => form.setField('codigo', e.target.value.toUpperCase())} error={form.errors.codigo} />
            <Input label="Setor" placeholder="A" list="sectors" value={form.values.setor} onChange={(e) => form.setField('setor', e.target.value)} error={form.errors.setor} />
            <datalist id="sectors">
              {sectors.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <Segmented
            label="Tipo de veículo"
            value={form.values.tipo}
            onChange={(v) => form.setField('tipo', v)}
            options={[
              { value: 'CARRO', label: 'Carro', icon: <Car className="h-4 w-4" /> },
              { value: 'MOTO', label: 'Moto', icon: <Bike className="h-4 w-4" /> },
            ]}
          />
          <Toggle label="Vaga ativa" description="Vagas inativas não recebem veículos (ex.: manutenção)." checked={form.values.ativa} onChange={(v) => form.setField('ativa', v)} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Excluir vaga"
        message={
          <>
            Excluir a vaga <strong>{toDelete?.codigo}</strong>? Vagas com histórico de movimentações não podem ser excluídas — nesse caso, desative-a.
          </>
        }
        confirmLabel="Excluir"
        loading={busy}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
