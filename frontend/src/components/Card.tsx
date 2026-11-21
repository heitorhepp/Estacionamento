/**
 * Card.tsx
 * Superfícies padrão: Card (container branco) e StatCard (indicador do dashboard).
 */
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-ink-100 bg-white shadow-soft ${className}`}>{children}</div>;
}

type Tone = 'brand' | 'free' | 'occupied' | 'overdue' | 'ink';

const toneStyles: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  free: 'bg-free-50 text-free-600',
  occupied: 'bg-occupied-50 text-occupied-600',
  overdue: 'bg-overdue-50 text-overdue-600',
  ink: 'bg-ink-100 text-ink-600',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  /** Linha de apoio abaixo do valor (ex.: "R$ 120 estadias + R$ 300 mensalidades"). */
  hint?: ReactNode;
  /** Barra de progresso (0–100), usada na ocupação. */
  progress?: number;
}

/** Card de indicador com ícone, valor grande e dica opcional. */
export function StatCard({ label, value, icon, tone = 'brand', hint, progress }: StatCardProps) {
  return (
    <Card className="p-5 transition-shadow duration-200 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneStyles[tone]}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress >= 90 ? 'bg-occupied-500' : progress >= 70 ? 'bg-overdue-500' : 'bg-free-500'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}
