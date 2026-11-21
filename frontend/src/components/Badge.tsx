/**
 * Badge.tsx
 * Etiquetas coloridas de status, mais os atalhos para status de movimentação e de mensalidade.
 */
import type { ReactNode } from 'react';
import type { MembershipStatus, MovementStatus } from '../types';
import { MEMBERSHIP_LABEL, MOVEMENT_STATUS_LABEL } from '../utils/format';

export type BadgeTone = 'brand' | 'free' | 'occupied' | 'overdue' | 'ink';

const tones: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  free: 'bg-free-50 text-free-700 ring-free-100',
  occupied: 'bg-occupied-50 text-occupied-700 ring-occupied-100',
  overdue: 'bg-overdue-50 text-overdue-700 ring-overdue-100',
  ink: 'bg-ink-100 text-ink-600 ring-ink-200',
};

export function Badge({ tone = 'ink', children, dot }: { tone?: BadgeTone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const movementTone: Record<MovementStatus, BadgeTone> = { ABERTA: 'brand', FINALIZADA: 'free', CANCELADA: 'ink' };
const membershipTone: Record<MembershipStatus, BadgeTone> = { EM_DIA: 'free', VENCIDA: 'overdue', NAO_MENSALISTA: 'ink' };

export function MovementStatusBadge({ status }: { status: MovementStatus }) {
  return (
    <Badge tone={movementTone[status]} dot>
      {MOVEMENT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  return (
    <Badge tone={membershipTone[status]} dot>
      {MEMBERSHIP_LABEL[status]}
    </Badge>
  );
}
