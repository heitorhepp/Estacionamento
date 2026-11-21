/**
 * useNow.ts
 * Devolve a hora atual e se atualiza sozinho — usado no "tempo decorrido" do pátio.
 */
import { useEffect, useState } from 'react';

/** @param intervalMs Frequência de atualização (padrão: 30 s). */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
