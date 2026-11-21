/**
 * Dashboard.tsx
 * Dashboard do ADMIN (dados já sem movimentações canceladas, calculados no back-end):
 * - Cards: ocupação por tipo, veículos no pátio, faturamento do dia e do mês,
 *   tempo médio de permanência, mensalistas vencidos.
 * - Gráficos (recharts): faturamento diário (linha), entradas por hora (barras, com
 *   o horário de pico destacado) e receita avulsa vs mensalidades (rosca).
 * - Filtro de período (atalhos de 7/30/90 dias ou datas personalizadas).
 */
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bike, Car, CircleDollarSign, Clock, Gauge, TrendingUp, TriangleAlert } from 'lucide-react';
import { Card, StatCard } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/FormFields';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { useAsync } from '../../hooks/useAsync';
import { dashboardService } from '../../services/dashboard.service';
import { addDaysKey, formatCurrency, formatDateKey, formatDuration, todayKey } from '../../utils/format';

const presets = [7, 30, 90];
const COLORS = { brand: '#1f47f5', brandLight: '#8eb6ff', free: '#10b981', overdue: '#f59e0b', grid: '#eceef2', axis: '#8593ab' };

/** Rótulo curto de data para o eixo X (20/11). */
const shortDate = (key: string) => formatDateKey(key).slice(0, 5);
const compactCurrency = (value: number) => (value >= 1000 ? `R$ ${(value / 1000).toFixed(1)}k` : `R$ ${value}`);

/** Card com título para cada gráfico. */
function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`p-5 ${className}`}>
      <h2 className="font-bold text-ink-900">{title}</h2>
      {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
      <div className="mt-4 h-72">{children}</div>
    </Card>
  );
}

export function Dashboard() {
  const [range, setRange] = useState({ dataInicio: addDaysKey(todayKey(), -29), dataFim: todayKey() });
  const [preset, setPreset] = useState<number | null>(30);
  const { data, loading, error } = useAsync(() => dashboardService.get(range), [range.dataInicio, range.dataFim]);

  function applyPreset(days: number) {
    setPreset(days);
    setRange({ dataInicio: addDaysKey(todayKey(), -(days - 1)), dataFim: todayKey() });
  }

  const peakHour = useMemo(() => {
    const hours = data?.graficos.movimentoPorHora ?? [];
    return hours.reduce((best, h) => (h.entradas > best.entradas ? h : best), { hora: -1, entradas: 0 });
  }, [data]);

  const totalRevenue = data?.graficos.receitaPorOrigem.reduce((sum, r) => sum + r.valor, 0) ?? 0;
  const car = data?.cards.ocupacao.find((o) => o.tipo === 'CARRO');
  const moto = data?.cards.ocupacao.find((o) => o.tipo === 'MOTO');

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral da operação e do faturamento." />

      <Card className="mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
          {presets.map((days) => (
            <button
              key={days}
              onClick={() => applyPreset(days)}
              className={`h-9 flex-1 rounded-lg px-4 text-sm font-semibold transition-all sm:flex-none ${preset === days ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
            >
              {days} dias
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Input type="date" aria-label="Data inicial" value={range.dataInicio} max={range.dataFim} onChange={(e) => (setPreset(null), setRange((r) => ({ ...r, dataInicio: e.target.value })))} />
          <Input type="date" aria-label="Data final" value={range.dataFim} min={range.dataInicio} onChange={(e) => (setPreset(null), setRange((r) => ({ ...r, dataFim: e.target.value })))} />
        </div>
      </Card>

      {error ? (
        <Card>
          <EmptyState title="Não foi possível carregar o dashboard" description={error} />
        </Card>
      ) : loading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Ocupação — carros"
              value={`${car?.percentualOcupacao ?? 0}%`}
              icon={<Car className="h-5 w-5" />}
              progress={car?.percentualOcupacao ?? 0}
              hint={`${car?.ocupadas ?? 0} de ${car?.total ?? 0} vagas`}
            />
            <StatCard
              label="Ocupação — motos"
              value={`${moto?.percentualOcupacao ?? 0}%`}
              icon={<Bike className="h-5 w-5" />}
              progress={moto?.percentualOcupacao ?? 0}
              hint={`${moto?.ocupadas ?? 0} de ${moto?.total ?? 0} vagas`}
            />
            <StatCard label="Veículos no pátio" value={data.cards.veiculosNoPatio} icon={<Gauge className="h-5 w-5" />} tone="ink" hint="Agora" />
            <StatCard
              label="Mensalistas vencidos"
              value={data.cards.mensalistasVencidos}
              icon={<TriangleAlert className="h-5 w-5" />}
              tone={data.cards.mensalistasVencidos ? 'overdue' : 'free'}
              hint={data.cards.mensalistasVencidos ? 'Cobrar regularização' : 'Todos em dia'}
            />
            <StatCard
              label="Faturamento hoje"
              value={formatCurrency(data.cards.faturamentoHoje.total)}
              icon={<CircleDollarSign className="h-5 w-5" />}
              tone="free"
              hint={`${formatCurrency(data.cards.faturamentoHoje.estadias)} estadias · ${formatCurrency(data.cards.faturamentoHoje.mensalidades)} mensalidades`}
            />
            <StatCard
              label="Faturamento do mês"
              value={formatCurrency(data.cards.faturamentoMes.total)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="free"
              hint={`${formatCurrency(data.cards.faturamentoMes.estadias)} estadias · ${formatCurrency(data.cards.faturamentoMes.mensalidades)} mensalidades`}
            />
            <StatCard
              label="Tempo médio de permanência"
              value={formatDuration(data.cards.tempoMedioPermanenciaMinutos)}
              icon={<Clock className="h-5 w-5" />}
              tone="brand"
              hint="No período selecionado"
            />
            <StatCard
              label="Horário de pico"
              value={peakHour.hora >= 0 ? `${String(peakHour.hora).padStart(2, '0')}h` : '—'}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="brand"
              hint={peakHour.hora >= 0 ? `${peakHour.entradas} entradas nesse horário` : 'Sem entradas no período'}
            />
          </div>

          <ChartCard title="Faturamento diário" subtitle={`${formatDateKey(data.periodo.dataInicio)} a ${formatDateKey(data.periodo.dataFim)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.graficos.faturamentoDiario} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="data" tickFormatter={shortDate} tick={{ fontSize: 12, fill: COLORS.axis }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 12, fill: COLORS.axis }} tickLine={false} axisLine={false} width={70} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(label) => formatDateKey(String(label))} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total" name="Total" stroke={COLORS.brand} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="estadias" name="Estadias" stroke={COLORS.brandLight} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mensalidades" name="Mensalidades" stroke={COLORS.free} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-5">
            <ChartCard title="Movimento por hora do dia" subtitle="Entradas no período — o destaque é o horário de pico" className="lg:col-span-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.graficos.movimentoPorHora} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="hora" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 11, fill: COLORS.axis }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: COLORS.axis }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f6f7f9' }} formatter={(value) => [value, 'Entradas']} labelFormatter={(h) => `${h}h às ${Number(h) + 1}h`} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2' }} />
                  <Bar dataKey="entradas" radius={[6, 6, 0, 0]}>
                    {data.graficos.movimentoPorHora.map((h) => (
                      <Cell key={h.hora} fill={h.hora === peakHour.hora ? COLORS.brand : COLORS.brandLight} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Receita por origem" subtitle="Avulso vs mensalidades no período" className="lg:col-span-2">
              {totalRevenue === 0 ? (
                <EmptyState title="Sem receita no período" />
              ) : (
                <div className="relative h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.graficos.receitaPorOrigem} dataKey="valor" nameKey="origem" innerRadius="62%" outerRadius="85%" paddingAngle={3} strokeWidth={0}>
                        <Cell fill={COLORS.brand} />
                        <Cell fill={COLORS.free} />
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2' }} />
                      <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-x-0 top-[40%] -translate-y-1/2 text-center">
                    <p className="text-xs text-ink-500">Total</p>
                    <p className="text-lg font-bold text-ink-900">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </>
  );
}
