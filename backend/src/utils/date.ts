/**
 * date.ts
 * Funções de data centralizadas no fuso America/Sao_Paulo (regra 18).
 *
 * Como funciona:
 * - O banco guarda instantes em UTC (timestamptz).
 * - Tudo que depende de "que dia/hora é em São Paulo" (faturamento do dia,
 *   horário de pico, vencimento da mensalidade) passa por aqui.
 * - Datas sem hora (ex.: "2026-11-20") são chamadas de "dateKey" (texto AAAA-MM-DD),
 *   que é fácil de comparar, agrupar e mandar para o front.
 */

export const TIMEZONE = 'America/Sao_Paulo';

// shortcut: o Brasil não tem horário de verão desde 2019, então o offset é fixo em -03:00.
// Se o horário de verão voltar, trocar por uma lib de fuso (ex.: date-fns-tz).
const SAO_PAULO_OFFSET = '-03:00';

// Formatter reutilizado (criar um Intl.DateTimeFormat a cada chamada é caro).
const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

/**
 * Lê ano, mês, dia e hora de um instante, como um relógio em São Paulo mostraria.
 * @param date Instante (UTC).
 * @returns Partes da data no fuso de São Paulo.
 */
function getSaoPauloParts(date: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: Number(parts.hour) };
}

/**
 * Converte um instante no dia correspondente em São Paulo.
 * Ex.: 2026-11-21T01:30Z → "2026-11-20" (ainda é 22h30 do dia 20 em SP).
 * @param date Instante.
 * @returns dateKey no formato AAAA-MM-DD.
 */
export function toDateKey(date: Date): string {
  const { year, month, day } = getSaoPauloParts(date);
  return `${year}-${month}-${day}`;
}

/** @returns O dia de hoje em São Paulo (AAAA-MM-DD). */
export function todayKey(): string {
  return toDateKey(new Date());
}

/**
 * @param date Instante.
 * @returns Hora do dia (0–23) em São Paulo. Usado no gráfico de horário de pico.
 */
export function getSaoPauloHour(date: Date): number {
  return getSaoPauloParts(date).hour;
}

/**
 * @param dateKey Dia (AAAA-MM-DD).
 * @returns Instante de 00:00:00.000 desse dia em São Paulo.
 */
export function startOfDay(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000${SAO_PAULO_OFFSET}`);
}

/**
 * @param dateKey Dia (AAAA-MM-DD).
 * @returns Instante de 23:59:59.999 desse dia em São Paulo.
 */
export function endOfDay(dateKey: string): Date {
  return new Date(`${dateKey}T23:59:59.999${SAO_PAULO_OFFSET}`);
}

/**
 * Soma (ou subtrai) dias a um dateKey.
 * @param dateKey Dia base.
 * @param days Quantidade de dias (pode ser negativa).
 * @returns Novo dateKey.
 */
export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Soma meses a um dateKey. Se o dia não existir no mês de destino, usa o último dia
 * (31/01 + 1 mês = 28/02 ou 29/02), em vez de "pular" para março como o Date faria.
 * @param dateKey Dia base.
 * @param months Quantidade de meses.
 * @returns Novo dateKey.
 */
export function addMonths(dateKey: string, months: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDayOfTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDayOfTarget));
  return target.toISOString().slice(0, 10);
}

/**
 * Converte um campo @db.Date do Prisma em dateKey.
 * O Prisma devolve colunas DATE como meia-noite UTC, então basta cortar a string.
 * @param date Valor lido de uma coluna DATE.
 * @returns dateKey.
 */
export function dateOnlyToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Converte um dateKey no formato que o Prisma espera para gravar em coluna DATE.
 * @param dateKey Dia (AAAA-MM-DD).
 * @returns Date à meia-noite UTC.
 */
export function keyToDateOnly(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/**
 * Lista todos os dias entre dois dateKeys (inclusive).
 * @returns Array de dateKeys em ordem.
 */
export function listDays(startKey: string, endKey: string): string[] {
  const days: string[] = [];
  for (let key = startKey; key <= endKey; key = addDays(key, 1)) days.push(key);
  return days;
}

const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' });

/**
 * @param dateKey Dia (AAAA-MM-DD).
 * @returns Nome do dia da semana em português (ex.: "sexta-feira").
 */
export function weekdayName(dateKey: string): string {
  // Meio-dia UTC: a data não "escorrega" para o dia anterior em nenhum fuso.
  return weekdayFormatter.format(new Date(`${dateKey}T12:00:00Z`));
}

/**
 * Diferença em minutos COMPLETOS entre dois instantes (segundos são descartados).
 * @returns Minutos inteiros (nunca negativo).
 */
export function diffInMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
}
