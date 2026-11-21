/**
 * format.ts
 * Formatação para exibição: moeda (R$ 12,00), tempo ("2h 35min"), datas no fuso
 * de São Paulo, placas e rótulos dos enums.
 */
import type { MembershipStatus, MovementStatus, PaymentMethod, VehicleType } from '../types';

const TIMEZONE = 'America/Sao_Paulo';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * @param value Número ou texto Decimal vindo da API (ex.: "12.5").
 * @returns Ex.: "R$ 12,50". Nulo vira "—".
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return currencyFormatter.format(Number(value));
}

/**
 * @param minutes Minutos totais.
 * @returns Ex.: 155 → "2h 35min"; 40 → "40min"; 1500 → "1d 1h 0min".
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}min`;
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins}min`;
}

/** Minutos completos entre um instante ISO e agora (ou outro instante). */
export function minutesSince(iso: string, until: Date = new Date()): number {
  return Math.max(0, Math.floor((until.getTime() - new Date(iso).getTime()) / 60_000));
}

/** @returns Ex.: "20/11/2026 14:35" no horário de Brasília. */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTimeFormatter.format(new Date(iso)) : '—';
}

/** @returns Ex.: "14:35" no horário de Brasília. */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/**
 * Formata uma data sem hora (AAAA-MM-DD) sem conversão de fuso.
 * @returns Ex.: "2026-11-20" → "20/11/2026".
 */
export function formatDateKey(dateKey: string | null | undefined): string {
  if (!dateKey) return '—';
  const [y, m, d] = dateKey.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** @returns Ex.: "2026-11" → "nov/2026". */
export function formatMonthRef(ref: string): string {
  const [y, m] = ref.split('-').map(Number);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' });
  return `${month.replace('.', '')}/${y}`;
}

/** @returns O dia de hoje em São Paulo (AAAA-MM-DD), para inputs de data. */
export function todayKey(): string {
  return dayKeyFormatter.format(new Date());
}

/** Soma dias a um AAAA-MM-DD. */
export function addDaysKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Exibe a placa como o padrão do veículo: antiga com hífen (ABC-1234),
 * Mercosul sem hífen (ABC1D23).
 */
export function formatPlate(plate: string): string {
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{3}\d{4}$/.test(clean) ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

/** Valida placa antiga ou Mercosul (mesma regra do back-end). */
export function isValidPlate(plate: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate.toUpperCase().replace(/[^A-Z0-9]/g, ''));
}

/** Máscara de CPF enquanto digita: 000.000.000-00. */
export function maskCpf(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Máscara de telefone: (11) 91234-5678. */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

/** Iniciais para o avatar (ex.: "Ana Souza" → "AS"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = { CARRO: 'Carro', MOTO: 'Moto' };

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  MENSALISTA: 'Mensalista',
};

export const MOVEMENT_STATUS_LABEL: Record<MovementStatus, string> = {
  ABERTA: 'No pátio',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  EM_DIA: 'Em dia',
  VENCIDA: 'Vencida',
  NAO_MENSALISTA: 'Avulso',
};

export const ROLE_LABEL = { ADMIN: 'Administrador', OPERADOR: 'Operador', CLIENTE: 'Cliente' } as const;
