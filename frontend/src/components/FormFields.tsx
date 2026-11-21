/**
 * FormFields.tsx
 * Campos de formulário padronizados (Input, Select, Textarea, Segmented), todos com
 * rótulo, dica, selo opcional (ex.: "sugerido pela IA") e mensagem de erro abaixo do campo.
 */
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Conteúdo ao lado do rótulo (ex.: selo "sugerido pela IA"). */
  badge?: ReactNode;
  className?: string;
}

const controlBase =
  'w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 transition-colors duration-150 focus:outline-none focus:ring-4 disabled:bg-ink-50 disabled:text-ink-500';

/** Classes do controle conforme haja erro ou não. */
function controlClass(error?: string) {
  return `${controlBase} ${
    error ? 'border-occupied-500 focus:border-occupied-500 focus:ring-occupied-100' : 'border-ink-200 focus:border-brand-500 focus:ring-brand-100'
  }`;
}

/** Envoltório com rótulo, erro e dica — usado pelos campos abaixo. */
function Field({ id, label, error, hint, badge, className = '', children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={id} className="text-sm font-medium text-ink-700">
            {label}
          </label>
          {badge}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-occupied-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      )}
    </div>
  );
}

type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode };

/** Campo de texto com ícone opcional à esquerda. */
export function Input({ label, error, hint, badge, className, icon, ...props }: InputProps) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} badge={badge} className={className}>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${controlClass(error)} h-11 ${icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>
    </Field>
  );
}

type SelectProps = FieldProps & SelectHTMLAttributes<HTMLSelectElement>;

/** Lista de seleção nativa (no celular abre o seletor do sistema). */
export function Select({ label, error, hint, badge, className, children, ...props }: SelectProps) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} badge={badge} className={className}>
      <select id={id} aria-invalid={Boolean(error)} className={`${controlClass(error)} h-11 pr-8`} {...props}>
        {children}
      </select>
    </Field>
  );
}

type TextareaProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Área de texto de várias linhas. */
export function Textarea({ label, error, hint, badge, className, ...props }: TextareaProps) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} badge={badge} className={className}>
      <textarea id={id} aria-invalid={Boolean(error)} rows={3} className={`${controlClass(error)} resize-none py-2.5`} {...props} />
    </Field>
  );
}

interface SegmentedProps<T extends string> extends FieldProps {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
}

/** Botões lado a lado para escolha única (ex.: Carro/Moto, forma de pagamento). */
export function Segmented<T extends string>({ label, error, hint, badge, className, value, onChange, options }: SegmentedProps<T>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} badge={badge} className={className}>
      <div role="radiogroup" id={id} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50'
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** Interruptor liga/desliga acessível. */
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-ink-200 p-3.5 transition-colors hover:bg-ink-50">
      <span>
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-600' : 'bg-ink-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
