/**
 * useAsync.ts
 * Hook para carregar dados da API com estados de carregamento e erro.
 * Opcionalmente recarrega em intervalo (ex.: mapa de vagas "em tempo real").
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../utils/errors';

/**
 * @param loader Função que busca os dados.
 * @param deps Dependências: quando mudam, recarrega.
 * @param intervalMs Se informado, recarrega em segundo plano nesse intervalo.
 * @returns { data, loading, error, reload, setData }
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = [], intervalMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  /** @param silent true = não mostra skeleton (usado no polling e após salvar). */
  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => reload(true), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, reload]);

  return { data, loading, error, reload, setData };
}
