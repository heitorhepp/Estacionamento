/**
 * tariff.ts
 * Cálculo do valor de uma estadia (regra 4).
 *
 * É uma FUNÇÃO PURA: não acessa banco, não lê a hora atual, não tem efeitos colaterais.
 * Recebe os minutos e os preços e devolve o valor. Isso deixa a regra de negócio mais
 * importante do sistema fácil de testar (ver tariff.test.ts) e de explicar.
 *
 * Todos os valores são em CENTAVOS (números inteiros). Somar reais com casas decimais em
 * ponto flutuante gera erros como 0.1 + 0.2 = 0.30000000000000004; com centavos, não.
 */

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** Preços usados no cálculo — na prática, a cópia congelada na entrada (regra 5). */
export interface TariffPrices {
  toleranceMinutes: number;
  firstHourCents: number;
  additionalHourCents: number;
  dailyCents: number;
}

/**
 * Calcula quanto cobrar por um período de até 24h (sem a tolerância).
 * - Até 60 min: primeira hora.
 * - Cada hora adicional INICIADA é cobrada inteira (1h01 = 2 horas).
 * - Nunca passa do valor da diária (teto).
 * @param minutes Minutos dentro do período (0 a 1439).
 * @param prices Tabela de preços.
 * @returns Valor em centavos.
 */
function calculatePeriodFee(minutes: number, prices: TariffPrices): number {
  if (minutes === 0) return 0;

  const hours = Math.ceil(minutes / MINUTES_PER_HOUR);
  const fee = prices.firstHourCents + (hours - 1) * prices.additionalHourCents;

  return Math.min(fee, prices.dailyCents);
}

/**
 * Calcula o valor total de uma estadia.
 *
 * Regras:
 * 1. Até a tolerância (ex.: 15 min) → R$ 0,00. A tolerância vale para a estadia
 *    inteira, não para cada dia: quem fica 24h05 paga 1 diária + 1 hora.
 * 2. Acima da tolerância → primeira hora + horas adicionais iniciadas.
 * 3. Cada bloco de 24h custa no máximo uma diária.
 * 4. Acima de 24h → diárias completas + o restante pelas regras 2 e 3.
 *
 * Exemplos (tolerância 15 min, 1ª hora R$ 10, adicional R$ 5, diária R$ 50):
 * - 10 min  → R$ 0
 * - 50 min  → R$ 10
 * - 1h01    → R$ 15 (2 horas)
 * - 20h     → R$ 50 (seria R$ 105, limitado à diária)
 * - 26h30   → R$ 50 (1 diária) + R$ 20 (3 horas) = R$ 70
 *
 * @param minutes Tempo de permanência em minutos completos.
 * @param prices Tabela de preços (congelada na entrada).
 * @returns Valor em centavos.
 */
export function calculateFee(minutes: number, prices: TariffPrices): number {
  if (minutes <= prices.toleranceMinutes) return 0;

  const fullDays = Math.floor(minutes / MINUTES_PER_DAY);
  const remainingMinutes = minutes % MINUTES_PER_DAY;

  return fullDays * prices.dailyCents + calculatePeriodFee(remainingMinutes, prices);
}

/**
 * Converte reais (número, texto ou Decimal do Prisma) em centavos inteiros.
 * @param value Ex.: 12.5, "12.50" ou Prisma.Decimal.
 * @returns Ex.: 1250.
 */
export function toCents(value: number | string | { toString(): string }): number {
  return Math.round(Number(value.toString()) * 100);
}

/**
 * Converte centavos em reais.
 * @param cents Ex.: 1250.
 * @returns Ex.: 12.5.
 */
export function fromCents(cents: number): number {
  return cents / 100;
}
