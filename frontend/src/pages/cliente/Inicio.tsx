/**
 * Inicio.tsx
 * Página inicial do portal do cliente: saudação, vagas livres em tempo real,
 * veículo no pátio agora (se houver) e resumo da mensalidade.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Car, Clock, Wallet } from 'lucide-react';
import { AvailableSpots } from '../../components/AvailableSpots';
import { MembershipBadge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { PlateBadge } from '../../components/PlateBadge';
import { Skeleton } from '../../components/Skeleton';
import { useAsync } from '../../hooks/useAsync';
import { useNow } from '../../hooks/useNow';
import { portalService } from '../../services/portal.service';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDateKey, formatDuration, formatTime, minutesSince } from '../../utils/format';

/** Saudação conforme a hora do dia. */
function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export function Inicio() {
  const user = useAuthStore((state) => state.user);
  const now = useNow();
  const stays = useAsync(() => portalService.listStays(1, 5), [], 30_000);
  const membership = useAsync(portalService.getMembership, []);
  const parked = stays.data?.data.filter((s) => s.status === 'ABERTA') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
          {greeting()}, {user?.nome.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-ink-500">Veja como está o estacionamento agora.</p>
      </div>

      <Card className="p-5">
        <AvailableSpots />
      </Card>

      {parked.map((stay) => (
        <Card key={stay.id} className="overflow-hidden border-brand-200">
          <div className="flex flex-col gap-4 bg-gradient-to-r from-brand-600 to-brand-800 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Car className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-brand-100">Seu veículo está no pátio</p>
                <p className="font-semibold">
                  {stay.modelo} · Vaga {stay.vaga.codigo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <PlateBadge plate={stay.placa} />
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-xs text-brand-100">
                  <Clock className="h-3.5 w-3.5" /> desde {formatTime(stay.dataHoraEntrada)}
                </p>
                <p className="text-xl font-bold">{formatDuration(minutesSince(stay.dataHoraEntrada, now))}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-ink-900">
              <Wallet className="h-5 w-5 text-brand-600" /> Mensalidade
            </h2>
            {membership.data && <MembershipBadge status={membership.data.situacao} />}
          </div>
          {membership.loading ? (
            <Skeleton className="mt-4 h-12" />
          ) : membership.data?.situacao === 'NAO_MENSALISTA' ? (
            <p className="mt-3 text-sm text-ink-500">Você usa o estacionamento como avulso. Quer virar mensalista? Fale com a recepção.</p>
          ) : (
            <p className="mt-3 text-sm text-ink-600">
              {formatCurrency(membership.data?.valorMensal)} por mês · vencimento em{' '}
              <strong className={membership.data?.situacao === 'VENCIDA' ? 'text-overdue-600' : 'text-ink-900'}>{formatDateKey(membership.data?.dataVencimento)}</strong>
            </p>
          )}
          <Link to="/portal/mensalidade" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            Ver detalhes <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Últimas estadias</h2>
          {stays.loading ? (
            <Skeleton className="mt-4 h-24" />
          ) : stays.data?.data.length ? (
            <ul className="mt-3 divide-y divide-ink-100">
              {stays.data.data.slice(0, 3).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-600">
                    {formatDateKey(s.dataHoraEntrada.slice(0, 10))} · {formatDuration(s.minutosPermanencia)}
                  </span>
                  <span className="font-semibold text-ink-900">{s.status === 'ABERTA' ? 'Em andamento' : formatCurrency(s.valorCobrado)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-500">Você ainda não tem estadias. Cadastre seus veículos para elas aparecerem aqui.</p>
          )}
          <Link to="/portal/estadias" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            Ver histórico <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
