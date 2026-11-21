/**
 * PlateBadge.tsx
 * Exibe a placa desenhada como uma placa Mercosul (faixa azul no topo),
 * o que deixa listas e cards fáceis de escanear visualmente.
 */
import { formatPlate } from '../utils/format';

export function PlateBadge({ plate, size = 'md' }: { plate: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-xs px-2 pb-0.5', md: 'text-sm px-2.5 pb-0.5', lg: 'text-xl px-4 pb-1' };
  return (
    <span className="inline-flex flex-col overflow-hidden rounded-md border border-ink-300 bg-white font-mono font-bold tracking-[0.12em] text-ink-900 shadow-sm">
      <span className={`h-1.5 bg-brand-700 ${size === 'lg' ? 'h-2' : ''}`} />
      <span className={sizes[size]}>{formatPlate(plate)}</span>
    </span>
  );
}
