/**
 * MapaVagas.tsx
 * Mapa do pátio: grade de vagas coloridas por status (livre, ocupada, inativa),
 * agrupadas por setor, com legenda e contadores. Atualiza sozinho a cada 20 s.
 * - Vaga ocupada → abre detalhes (placa, foto, entrada, tempo decorrido) com saída/cancelamento.
 * - Vaga livre → vai para "Registrar entrada" com a vaga já escolhida.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, Bike, Car, Clock, RefreshCw, SquareParking } from 'lucide-react';
import { Button } from '../../components/Button';
import { CancelEntryModal } from '../../components/CancelEntryModal';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ExitModal } from '../../components/ExitModal';
import { Segmented } from '../../components/FormFields';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { PlateBadge } from '../../components/PlateBadge';
import { Skeleton } from '../../components/Skeleton';
import { useAsync } from '../../hooks/useAsync';
import { useNow } from '../../hooks/useNow';
import { spotService } from '../../services/spot.service';
import type { Spot, SpotStatus, VehicleType } from '../../types';
import { formatDateTime, formatDuration, formatTime, minutesSince } from '../../utils/format';

const REFRESH_MS = 20_000;

const statusStyles: Record<SpotStatus, string> = {
  LIVRE: 'border-free-500/30 bg-free-50 text-free-700 hover:border-free-500 hover:shadow-lift',
  OCUPADA: 'border-occupied-500/30 bg-occupied-50 text-occupied-700 hover:border-occupied-500 hover:shadow-lift',
  INATIVA: 'border-ink-200 bg-ink-100 text-ink-400 cursor-not-allowed',
};

const legend: Array<{ status: SpotStatus; label: string; dot: string }> = [
  { status: 'LIVRE', label: 'Livre', dot: 'bg-free-500' },
  { status: 'OCUPADA', label: 'Ocupada', dot: 'bg-occupied-500' },
  { status: 'INATIVA', label: 'Inativa', dot: 'bg-ink-300' },
];

export function MapaVagas() {
  const [type, setType] = useState<VehicleType | 'TODOS'>('TODOS');
  const [selected, setSelected] = useState<Spot | null>(null);
  const [exitId, setExitId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; placa: string } | null>(null);
  const navigate = useNavigate();
  const now = useNow();
  const { data: spots, loading, error, reload } = useAsync(spotService.list, [], REFRESH_MS);

  const filtered = useMemo(() => (spots ?? []).filter((s) => type === 'TODOS' || s.tipo === type), [spots, type]);
  const bySector = useMemo(() => {
    const groups = new Map<string, Spot[]>();
    filtered.forEach((spot) => groups.set(spot.setor, [...(groups.get(spot.setor) ?? []), spot]));
    return [...groups.entries()];
  }, [filtered]);
  const counts = useMemo(
    () => legend.map((l) => ({ ...l, total: filtered.filter((s) => s.status === l.status).length })),
    [filtered],
  );

  function handleClick(spot: Spot) {
    if (spot.status === 'OCUPADA') setSelected(spot);
    else if (spot.status === 'LIVRE') navigate(`/painel/entrada?vaga=${spot.id}`);
  }

  const current = selected?.movimentacaoAtual;

  return (
    <>
      <PageHeader
        title="Mapa de vagas"
        subtitle="Clique em uma vaga livre para registrar entrada ou em uma ocupada para ver os detalhes."
        actions={
          <Button variant="secondary" onClick={() => reload()} icon={<RefreshCw className="h-4 w-4" />}>
            Atualizar
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 gap-3 sm:flex">
          {counts.map((c) => (
            <Card key={c.status} className="flex items-center gap-3 px-4 py-3">
              <span className={`h-3 w-3 rounded-full ${c.dot}`} />
              <div>
                <p className="text-xl font-bold leading-none text-ink-900">{loading ? '–' : c.total}</p>
                <p className="mt-1 text-xs text-ink-500">{c.label}</p>
              </div>
            </Card>
          ))}
        </div>
        <Segmented
          className="w-full sm:w-80"
          value={type}
          onChange={setType}
          options={[
            { value: 'TODOS', label: 'Todas' },
            { value: 'CARRO', label: 'Carros', icon: <Car className="h-4 w-4" /> },
            { value: 'MOTO', label: 'Motos', icon: <Bike className="h-4 w-4" /> },
          ]}
        />
      </div>

      {loading ? (
        <Card className="p-5">
          <Skeleton className="mb-4 h-5 w-32" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
            {Array.from({ length: 16 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </Card>
      ) : error || !bySector.length ? (
        <Card>
          <EmptyState icon={<SquareParking className="h-7 w-7" />} title={error ? 'Não foi possível carregar o mapa' : 'Nenhuma vaga cadastrada'} description={error ?? 'O administrador pode cadastrar vagas em "Vagas".'} />
        </Card>
      ) : (
        <div className="space-y-6">
          {bySector.map(([sector, sectorSpots]) => (
            <Card key={sector} className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-ink-900">Setor {sector}</h2>
                <span className="text-xs text-ink-500">
                  {sectorSpots.filter((s) => s.status === 'LIVRE').length} livres de {sectorSpots.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 sm:gap-3 lg:grid-cols-8 xl:grid-cols-10">
                {sectorSpots.map((spot) => {
                  const Icon = spot.tipo === 'CARRO' ? Car : Bike;
                  return (
                    <button
                      key={spot.id}
                      onClick={() => handleClick(spot)}
                      disabled={spot.status === 'INATIVA'}
                      title={spot.status === 'INATIVA' ? 'Vaga inativa' : undefined}
                      className={`flex h-24 flex-col justify-between rounded-xl border-2 p-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 disabled:hover:translate-y-0 ${statusStyles[spot.status]}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{spot.codigo}</span>
                        <Icon className="h-4 w-4 opacity-70" />
                      </div>
                      {spot.movimentacaoAtual ? (
                        <div>
                          <p className="truncate font-mono text-[11px] font-bold tracking-wide">{spot.movimentacaoAtual.placa}</p>
                          <p className="text-[11px] opacity-80">{formatDuration(minutesSince(spot.movimentacaoAtual.dataHoraEntrada, now))}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium opacity-80">{spot.status === 'LIVRE' ? 'Livre' : 'Inativa'}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-500">
            {legend.map((l) => (
              <span key={l.status} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} /> {l.label}
              </span>
            ))}
            <span>· Atualiza automaticamente a cada 20 s</span>
          </div>
        </div>
      )}

      {/* Detalhes da vaga ocupada */}
      <Modal
        open={Boolean(selected && current)}
        onClose={() => setSelected(null)}
        title={`Vaga ${selected?.codigo ?? ''}`}
        description={`Setor ${selected?.setor ?? ''}`}
        footer={
          current && (
            <>
              <Button
                variant="secondary"
                icon={<Ban className="h-4 w-4" />}
                onClick={() => {
                  setCancelTarget({ id: current.id, placa: current.placa });
                  setSelected(null);
                }}
              >
                Cancelar entrada
              </Button>
              <Button
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => {
                  setExitId(current.id);
                  setSelected(null);
                }}
              >
                Registrar saída
              </Button>
            </>
          )
        }
      >
        {current && (
          <div className="space-y-4">
            {current.fotoEntradaUrl ? (
              <img src={current.fotoEntradaUrl} alt={`Foto do veículo ${current.placa}`} className="h-56 w-full rounded-2xl object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-ink-100 text-sm text-ink-400">Sem foto de entrada</div>
            )}
            <div className="flex items-center justify-between gap-3">
              <PlateBadge plate={current.placa} size="lg" />
              <p className="text-right text-sm text-ink-600">
                {current.modelo}
                <br />
                <span className="text-ink-400">{current.cor}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-xs text-ink-500">Entrada</p>
                <p className="font-semibold text-ink-800">{formatTime(current.dataHoraEntrada)}</p>
                <p className="text-xs text-ink-400">{formatDateTime(current.dataHoraEntrada)}</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-3">
                <p className="flex items-center gap-1 text-xs text-brand-600">
                  <Clock className="h-3.5 w-3.5" /> Tempo decorrido
                </p>
                <p className="text-lg font-bold text-brand-700">{formatDuration(minutesSince(current.dataHoraEntrada, now))}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ExitModal movementId={exitId} onClose={() => setExitId(null)} onDone={() => reload(true)} />
      <CancelEntryModal movement={cancelTarget} onClose={() => setCancelTarget(null)} onDone={() => reload(true)} />
    </>
  );
}
