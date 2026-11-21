/**
 * useForm.ts
 * Estado simples de formulário: valores, alteração por campo e erros por campo.
 * Ao editar um campo, o erro dele some (feedback imediato para o usuário).
 */
import { useState } from 'react';

export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Altera um campo e limpa o erro dele. */
  function setField<K extends keyof T>(field: K, value: T[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field as string]) return current;
      const next = { ...current };
      delete next[field as string];
      return next;
    });
  }

  /** Volta aos valores informados (ou aos iniciais) e limpa os erros. */
  function reset(next: T = initial) {
    setValues(next);
    setErrors({});
  }

  return { values, setValues, setField, errors, setErrors, reset };
}
