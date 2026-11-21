/**
 * Saida.tsx
 * Veículos no pátio agora, com busca por placa. Para cada um: registrar saída
 * (pré-visualização + confirmação) ou cancelar a entrada lançada por engano.
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, Ban, Search, SquareParking } from 'lucide-react';
import { Button } from '../../components/Button';
import { CancelEntryModal } from '../../components/CancelEntryModal';
import { ExitModal } from '../../components/ExitModal';
import { Input } from '../../components/FormFields';
import { PageHeader } from '../../components/PageHeader';
import { PlateBadge } from '../../components/PlateBadge';
import { Table, type Column } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { useAsync } from '../../hooks/useAsync';
import { useNow } from '../../hooks/useNow';
import { movementService } from '../../services/movement.service';
import type { Movement } from '../../types';
import { VEHICLE_TYPE_LABEL, formatDuration, formatTime, minutesSince } from '../../utils/format';

export function Saida() {
  const [search, setSearch] = useState('');
  const [exitId, setExitId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; placa: string } | null>(null);
  const now = useNow();
  const { data, loading, reload } = useAsync(() => movementService.list({ status: 'ABERTA', pageSize: 100 }), [], 30_000);

  const rows = useMemo(() => {
    const term = search.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (data?.data ?? []).filter((m) => !term || m.placa.includes(term));
  }, [data, search]);

  const actions = (m: Movement) => (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="ghost" onClick={() => setCancelTarget({ id: m.id, placa: m.placa })} icon={<Ban className="h-4 w-4" />}>
        Cancelar
      </Button>
      <Button size="sm" onClick={() => setExitId(m.id)} icon={<ArrowLeft className="h-4 w-4" />}>
        Saída
      </Button>
    </div>
  );

  const columns: Column<Movement>[] = [
    { header: 'Placa', cell: (m) => <PlateBadge plate={m.placa} size="sm" />, hideOnMobile: true },
    { header: 'Veículo', cell: (m) => <span>{m.modelo} · <span className="text-ink-400">{m.cor}</span></span> },
    { header: 'Vaga', cell: (m) => <span className="font-semibold">{m.vaga.codigo}</span> },
    { header: 'Entrada', cell: (m) => formatTime(m.dataHoraEntrada) },
    { header: 'Tempo', cell: (m) => <span className="font-semibold text-brand-700">{formatDuration(minutesSince(m.dataHoraEntrada, now))}</span> },
    { header: 'Cliente', cell: (m) => (m.veiculo ? <Badge tone={m.veiculo.cliente.mensalista ? 'brand' : 'ink'}>{m.veiculo.cliente.mensalista ? 'Mensalista' : 'Cadastrado'}</Badge> : <span className="text-ink-400">Avulso</span>) },
    { header: 'Tipo', cell: (m) => VEHICLE_TYPE_LABEL[m.tipoVeiculo] },
    { header: '', cell: actions, hideOnMobile: true, className: 'text-right' },
  ];

  return (
    <>
      <PageHeader title="Registrar saída" subtitle={`${data?.total ?? 0} veículo(s) no pátio agora.`} />
      <div className="mb-4 max-w-sm">
        <Input placeholder="Buscar placa..." icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Table
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        loading={loading}
        mobileTitle={(m) => <PlateBadge plate={m.placa} />}
        mobileActions={actions}
        empty={{
          icon: <SquareParking className="h-7 w-7" />,
          title: search ? 'Nenhum veículo com essa placa' : 'Pátio vazio',
          description: search ? 'Confira a placa digitada.' : 'Não há veículos no estacionamento agora.',
        }}
      />

      <ExitModal movementId={exitId} onClose={() => setExitId(null)} onDone={() => reload(true)} />
      <CancelEntryModal movement={cancelTarget} onClose={() => setCancelTarget(null)} onDone={() => reload(true)} />
    </>
  );
}
