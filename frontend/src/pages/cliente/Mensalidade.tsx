/**
 * Mensalidade.tsx
 * Situação da mensalidade do cliente (em dia / vencida / não é mensalista),
 * próximo vencimento, valor e histórico de pagamentos.
 */
import { BadgeCheck, CalendarDays, Receipt, TriangleAlert, Wallet } from 'lucide-react';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { useAsync } from '../../hooks/useAsync';
import { portalService } from '../../services/portal.service';
import { formatCurrency, formatDateKey, formatDateTime, formatMonthRef } from '../../utils/format';

const hero = {
  EM_DIA: { title: 'Mensalidade em dia', text: 'Suas estadias estão cobertas (um veículo por vez).', icon: BadgeCheck, style: 'from-free-500 to-free-700' },
  VENCIDA: { title: 'Mensalidade vencida', text: 'Enquanto não for regularizada, as estadias são cobradas como avulsas. Procure a recepção.', icon: TriangleAlert, style: 'from-overdue-500 to-overdue-700' },
  NAO_MENSALISTA: { title: 'Você não é mensalista', text: 'Suas estadias são cobradas pela tabela avulsa. Para virar mensalista, fale com a recepção.', icon: Wallet, style: 'from-ink-600 to-ink-800' },
};

export function Mensalidade() {
  const { data, loading, error } = useAsync(portalService.getMembership, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }
  if (error || !data) return <EmptyState title="Não foi possível carregar sua mensalidade" description={error ?? undefined} />;

  const info = hero[data.situacao];
  const Icon = info.icon;

  return (
    <>
      <PageHeader title="Mensalidade" />
      <div className={`rounded-2xl bg-gradient-to-br ${info.style} p-6 text-white shadow-lift`}>
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold">{info.title}</h2>
            <p className="mt-1 text-sm text-white/85">{info.text}</p>
          </div>
        </div>
        {data.situacao !== 'NAO_MENSALISTA' && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-4">
              <p className="flex items-center gap-1.5 text-xs text-white/75">
                <CalendarDays className="h-3.5 w-3.5" /> {data.situacao === 'VENCIDA' ? 'Venceu em' : 'Próximo vencimento'}
              </p>
              <p className="mt-1 text-lg font-bold">{formatDateKey(data.dataVencimento)}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="flex items-center gap-1.5 text-xs text-white/75">
                <Wallet className="h-3.5 w-3.5" /> Valor mensal
              </p>
              <p className="mt-1 text-lg font-bold">{formatCurrency(data.valorMensal)}</p>
            </div>
          </div>
        )}
      </div>

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 border-b border-ink-100 px-5 py-4 font-semibold text-ink-900">
          <Receipt className="h-5 w-5 text-ink-400" /> Histórico de pagamentos
        </h2>
        {data.pagamentos.length ? (
          <ul className="divide-y divide-ink-100">
            {data.pagamentos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="font-semibold text-ink-800">Referência {formatMonthRef(p.referenciaMes)}</p>
                  <p className="text-xs text-ink-500">Pago em {formatDateTime(p.dataPagamento)}</p>
                </div>
                <span className="font-bold text-free-700">{formatCurrency(p.valor)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Receipt className="h-7 w-7" />} title="Nenhum pagamento registrado" />
        )}
      </Card>
    </>
  );
}
