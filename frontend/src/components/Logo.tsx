/**
 * Logo.tsx
 * Marca do produto (ParkFlow): ícone + nome. Variante clara para fundos escuros.
 */
export function Logo({ variant = 'dark', subtitle }: { variant?: 'dark' | 'light'; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-brand-600" />
        <path d="M11 24V8h6.5a5 5 0 0 1 0 10H11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="leading-tight">
        <p className={`text-lg font-extrabold tracking-tight ${variant === 'light' ? 'text-white' : 'text-ink-900'}`}>
          Park<span className={variant === 'light' ? 'text-brand-300' : 'text-brand-500'}>Flow</span>
        </p>
        {subtitle && <p className={`text-[11px] font-medium uppercase tracking-wider ${variant === 'light' ? 'text-ink-400' : 'text-ink-500'}`}>{subtitle}</p>}
      </div>
    </div>
  );
}
