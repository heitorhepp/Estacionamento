/**
 * historyFiltersStore.ts
 * Filtros do histórico de movimentações em uma store Zustand.
 * Assim, ao abrir outra tela e voltar, os filtros e a página continuam como estavam.
 */
import { create } from 'zustand';
import type { MovementStatus } from '../types';

export interface HistoryFilters {
  placa: string;
  status: MovementStatus | '';
  dataInicio: string;
  dataFim: string;
  page: number;
}

const initialFilters: HistoryFilters = { placa: '', status: '', dataInicio: '', dataFim: '', page: 1 };

interface HistoryFiltersState {
  filters: HistoryFilters;
  /** Altera um ou mais filtros; mudar filtro volta para a página 1. */
  setFilters: (patch: Partial<HistoryFilters>) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

export const useHistoryFiltersStore = create<HistoryFiltersState>((set) => ({
  filters: initialFilters,
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch, page: 1 } })),
  setPage: (page) => set((state) => ({ filters: { ...state.filters, page } })),
  reset: () => set({ filters: initialFilters }),
}));
