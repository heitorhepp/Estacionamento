/**
 * dashboard.service.ts
 * Indicadores do dashboard do ADMIN. Movimentações CANCELADAS nunca entram
 * nas contas (regra 9).
 *
 * Faturamento = estadias FINALIZADAS (pela data de SAÍDA, quando o dinheiro entra)
 *             + pagamentos de mensalidade (pela data do pagamento).
 * Datas agrupadas no fuso de São Paulo (regra 18).
 */
import { Prisma, StatusMovimentacao } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { addDays, endOfDay, getSaoPauloHour, listDays, startOfDay, toDateKey, todayKey } from '../utils/date';
import { fromCents, toCents } from '../utils/tariff';
import { DashboardQuery } from '../schemas/dashboard.schema';
import { membershipStatusWhere } from './membership.service';
import { getOccupancySummary } from './spot.service';

const { ABERTA, FINALIZADA, CANCELADA } = StatusMovimentacao;
const MAX_PERIOD_DAYS = 366;

/**
 * Soma o faturamento (estadias + mensalidades) entre dois instantes.
 * @returns Valores em reais.
 */
async function sumRevenue(from: Date, to: Date) {
  const [stays, memberships] = await Promise.all([
    prisma.movimentacao.aggregate({
      _sum: { valorCobrado: true },
      where: { status: FINALIZADA, dataHoraSaida: { gte: from, lte: to } },
    }),
    prisma.pagamentoMensalidade.aggregate({ _sum: { valor: true }, where: { dataPagamento: { gte: from, lte: to } } }),
  ]);
  const staysCents = toCents(stays._sum.valorCobrado ?? 0);
  const membershipsCents = toCents(memberships._sum.valor ?? 0);
  return {
    estadias: fromCents(staysCents),
    mensalidades: fromCents(membershipsCents),
    total: fromCents(staysCents + membershipsCents),
  };
}

/**
 * Monta todos os dados do dashboard.
 * @param query Período (padrão: últimos 30 dias até hoje).
 * @throws 400 se o período for inválido.
 */
export async function getDashboard(query: DashboardQuery) {
  const endKey = query.dataFim ?? todayKey();
  const startKey = query.dataInicio ?? addDays(endKey, -29);
  if (startKey > endKey) throw new AppError('A data inicial deve ser anterior à data final.', 400);

  const days = listDays(startKey, endKey);
  if (days.length > MAX_PERIOD_DAYS) throw new AppError('O período máximo é de 1 ano.', 400);

  const now = new Date();
  const today = todayKey();
  const periodStart = startOfDay(startKey);
  const periodEnd = endOfDay(endKey);
  const periodFilter: Prisma.DateTimeFilter = { gte: periodStart, lte: periodEnd };

  // shortcut: as linhas do período são agregadas em memória (simples e legível).
  // Com centenas de milhares de registros, trocar por GROUP BY no banco ($queryRaw).
  const [occupancy, vehiclesInLot, revenueToday, revenueMonth, finishedInPeriod, paymentsInPeriod, entriesInPeriod, overdueMembers] =
    await Promise.all([
      getOccupancySummary(),
      prisma.movimentacao.count({ where: { status: ABERTA } }),
      sumRevenue(startOfDay(today), now),
      sumRevenue(startOfDay(`${today.slice(0, 7)}-01`), now),
      prisma.movimentacao.findMany({
        where: { status: FINALIZADA, dataHoraSaida: periodFilter },
        select: { dataHoraEntrada: true, dataHoraSaida: true, valorCobrado: true },
      }),
      prisma.pagamentoMensalidade.findMany({ where: { dataPagamento: periodFilter }, select: { dataPagamento: true, valor: true } }),
      prisma.movimentacao.findMany({
        where: { status: { not: CANCELADA }, dataHoraEntrada: periodFilter },
        select: { dataHoraEntrada: true },
      }),
      prisma.cliente.count({ where: membershipStatusWhere('VENCIDA') }),
    ]);

  // Faturamento e entradas por dia (gráfico de linha), valores em centavos durante a soma.
  const revenueByDay = new Map(days.map((day) => [day, { estadias: 0, mensalidades: 0, entradas: 0 }]));
  let totalStayMinutes = 0;
  for (const m of finishedInPeriod) {
    const bucket = revenueByDay.get(toDateKey(m.dataHoraSaida!));
    if (bucket) bucket.estadias += toCents(m.valorCobrado ?? 0);
    totalStayMinutes += (m.dataHoraSaida!.getTime() - m.dataHoraEntrada.getTime()) / 60_000;
  }
  for (const p of paymentsInPeriod) {
    const bucket = revenueByDay.get(toDateKey(p.dataPagamento));
    if (bucket) bucket.mensalidades += toCents(p.valor);
  }

  // Entradas por hora do dia (gráfico de barras → horário de pico).
  const entriesByHour = Array.from({ length: 24 }, (_, hora) => ({ hora, entradas: 0 }));
  for (const e of entriesInPeriod) {
    entriesByHour[getSaoPauloHour(e.dataHoraEntrada)].entradas++;
    const bucket = revenueByDay.get(toDateKey(e.dataHoraEntrada));
    if (bucket) bucket.entradas++;
  }

  const dailyRevenue = days.map((day) => {
    const { estadias, mensalidades, entradas } = revenueByDay.get(day)!;
    return {
      data: day,
      entradas,
      estadias: fromCents(estadias),
      mensalidades: fromCents(mensalidades),
      total: fromCents(estadias + mensalidades),
    };
  });

  const staysTotal = dailyRevenue.reduce((sum, d) => sum + toCents(d.estadias), 0);
  const membershipsTotal = dailyRevenue.reduce((sum, d) => sum + toCents(d.mensalidades), 0);

  return {
    periodo: { dataInicio: startKey, dataFim: endKey },
    cards: {
      ocupacao: occupancy,
      veiculosNoPatio: vehiclesInLot,
      faturamentoHoje: revenueToday,
      faturamentoMes: revenueMonth,
      tempoMedioPermanenciaMinutos: finishedInPeriod.length ? Math.round(totalStayMinutes / finishedInPeriod.length) : 0,
      mensalistasVencidos: overdueMembers,
    },
    graficos: {
      faturamentoDiario: dailyRevenue,
      movimentoPorHora: entriesByHour,
      receitaPorOrigem: [
        { origem: 'Avulso', valor: fromCents(staysTotal) },
        { origem: 'Mensalidades', valor: fromCents(membershipsTotal) },
      ],
    },
  };
}
