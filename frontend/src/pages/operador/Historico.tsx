/**
 * Historico.tsx
 * Histórico de movimentações com filtros (placa, status, período) guardados na store
 * Zustand, paginação e detalhes da estadia. Movimentações em aberto podem ser editadas
 * (regra 10: finalizadas/canceladas não podem).
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { History, Pencil, Search, X } from 'lucide-react';
import { MovementStatusBadge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input, Select, Textarea } from '../../components/FormFields';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { PlateBadge } from '../../components/PlateBadge';
import { Table, type Column } from '../../components/Table';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { movementService } from '../../services/movement.service';
import { useHistoryFiltersStore } from '../../stores/historyFiltersStore';
import type { Movement, MovementStatus } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { PAYMENT_LABEL, formatCurrency, formatDateTime, formatDuration, isValidPlate, minutesSince } from '../../utils/format';

const PAGE_SIZE = 15;

/** Duração da estadia (em andamento conta até agora). */
function stayDuration(m: Movement) {
  return formatDuration(minutesSince(m.dataHoraEntrada, m.dataHoraSaida ? new Date(m.dataHoraSaida) : new Date()));
}

export function Historico() {
  const { filters, setFilters, setPage, reset } = useHistoryFiltersStore();
  const [plateInput, setPlateInput] = useState(filters.placa);
  const [selected, setSelected] = useState<Movement | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm({ placa: '', modelo: '', cor: '', avariasObservadas: '' });

  // Espera o usuário parar de digitar (400 ms) antes de filtrar pela placa.
  useEffect(() => {
    const id = setTimeout(() => plateInput !== filters.placa && setFilters({ placa: plateInput }), 400);
    return () => clearTimeout(id);
  }, [plateInput, filters.placa, setFilters]);

  const { data, loading, reload } = useAsync(
    () =>
      movementService.list({
        placa: filters.placa || undefined,
        status: filters.status || undefined,
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined,
        page: filters.page,
        pageSize: PAGE_SIZE,
      }),
    [filters],
  );

  function openDetails(m: Movement) {
    setSelected(m);
    setEditing(false);
    form.reset({ placa: m.placa, modelo: m.modelo, cor: m.cor, avariasObservadas: m.avariasObservadas ?? '' });
  }

  async function saveEdit() {
    if (!selected) return;
    if (!isValidPlate(form.values.placa)) return form.setErrors({ placa: 'Placa inválida.' });
    setSaving(true);
    try {
      const updated = await movementService.update(selected.id, { ...form.values, avariasObservadas: form.values.avariasObservadas || null });
      toast.success('Movimentação atualizada.');
      setSelected(updated);
      setEditing(false);
      reload(true);
    } catch (err) {
      form.setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const hasFilters = filters.placa || filters.status || filters.dataInicio || filters.dataFim;

  const columns: Column<Movement>[] = [
    { header: 'Placa', cell: (m) => <PlateBadge plate={m.placa} size="sm" />, hideOnMobile: true },
    { header: 'Vaga', cell: (m) => m.vaga.codigo },
    { header: 'Entrada', cell: (m) => formatDateTime(m.dataHoraEntrada) },
    { header: 'Saída', cell: (m) => formatDateTime(m.dataHoraSaida) },
    { header: 'Tempo', cell: (m) => (m.status === 'CANCELADA' ? '—' : stayDuration(m)) },
    { header: 'Valor', cell: (m) => <span className="font-semibold">{formatCurrency(m.valorCobrado)}</span> },
    { header: 'Status', cell: (m) => <MovementStatusBadge status={m.status} /> },
  ];

  return (
    <>
      <PageHeader title="Histórico" subtitle="Todas as movimentações do estacionamento." />

      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input placeholder="Placa" icon={<Search className="h-4 w-4" />} value={plateInput} onChange={(e) => setPlateInput(e.target.value)} />
        <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value as MovementStatus | '' })}>
          <option value="">Todos os status</option>
          <option value="ABERTA">No pátio</option>
          <option value="FINALIZADA">Finalizadas</option>
          <option value="CANCELADA">Canceladas</option>
        </Select>
        <Input type="date" aria-label="Data inicial" value={filters.dataInicio} onChange={(e) => setFilters({ dataInicio: e.target.value })} />
        <Input type="date" aria-label="Data final" value={filters.dataFim} onChange={(e) => setFilters({ dataFim: e.target.value })} />
        <Button
          variant="ghost"
          disabled={!hasFilters}
          onClick={() => {
            reset();
            setPlateInput('');
          }}
          icon={<X className="h-4 w-4" />}
        >
          Limpar filtros
        </Button>
      </Card>

      <Table
        columns={columns}
        rows={data?.data}
        rowKey={(m) => m.id}
        loading={loading}
        onRowClick={openDetails}
        mobileTitle={(m) => <PlateBadge plate={m.placa} />}
        empty={{ icon: <History className="h-7 w-7" />, title: 'Nenhuma movimentação encontrada', description: hasFilters ? 'Tente ajustar os filtros.' : undefined }}
      />
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Detalhes da movimentação"
        size="lg"
        footer={
          selected?.status === 'ABERTA' &&
          (editing ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Descartar
              </Button>
              <Button onClick={saveEdit} loading={saving}>
                Salvar alterações
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setEditing(true)} icon={<Pencil className="h-4 w-4" />}>
              Editar dados do veículo
            </Button>
          ))
        }
      >
        {selected &&
          (editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Placa" className="sm:col-span-2" value={form.values.placa} onChange={(e) => form.setField('placa', e.target.value.toUpperCase())} error={form.errors.placa} />
              <Input label="Modelo" value={form.values.modelo} onChange={(e) => form.setField('modelo', e.target.value)} error={form.errors.modelo} />
              <Input label="Cor" value={form.values.cor} onChange={(e) => form.setField('cor', e.target.value)} error={form.errors.cor} />
              <Textarea label="Avarias observadas" className="sm:col-span-2" value={form.values.avariasObservadas} onChange={(e) => form.setField('avariasObservadas', e.target.value)} />
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {selected.fotoEntradaUrl ? (
                <img src={selected.fotoEntradaUrl} alt="Foto da entrada" className="h-56 w-full rounded-2xl object-cover sm:h-full" />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-2xl bg-ink-100 text-sm text-ink-400 sm:h-full">Sem foto de entrada</div>
              )}
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <PlateBadge plate={selected.placa} size="lg" />
                  <MovementStatusBadge status={selected.status} />
                </div>
                {[
                  ['Veículo', `${selected.modelo} · ${selected.cor}`],
                  ['Vaga', `${selected.vaga.codigo} (Setor ${selected.vaga.setor})`],
                  ['Entrada', `${formatDateTime(selected.dataHoraEntrada)} · ${selected.operadorEntrada.nome}`],
                  ['Saída', selected.dataHoraSaida ? `${formatDateTime(selected.dataHoraSaida)} · ${selected.operadorSaida?.nome ?? ''}` : '—'],
                  ['Permanência', selected.status === 'CANCELADA' ? '—' : stayDuration(selected)],
                  ['Valor', formatCurrency(selected.valorCobrado)],
                  ['Pagamento', selected.formaPagamento ? PAYMENT_LABEL[selected.formaPagamento] : '—'],
                  ['Cliente', selected.veiculo ? selected.veiculo.cliente.usuario.nome : 'Avulso'],
                  ['Avarias', selected.avariasObservadas ?? 'Nenhuma registrada'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-ink-100 pb-2">
                    <dt className="text-ink-500">{label}</dt>
                    <dd className="text-right font-medium text-ink-800">{value}</dd>
                  </div>
                ))}
                {selected.motivoCancelamento && <p className="rounded-xl bg-ink-100 p-3 text-ink-700">Motivo do cancelamento: {selected.motivoCancelamento}</p>}
              </dl>
            </div>
          ))}
      </Modal>
    </>
  );
}
