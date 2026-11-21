/**
 * dashboard.service.ts
 * Chamadas do dashboard do ADMIN e do assistente de IA.
 */
import type { Dashboard } from '../types';
import { api } from './api';

export const dashboardService = {
  get: (params: { dataInicio?: string; dataFim?: string }) => api.get<Dashboard>('/dashboard', { params }).then((r) => r.data),
  /** Pergunta ao assistente (Gemini) sobre os dados agregados. */
  ask: (pergunta: string) => api.post<{ resposta: string }>('/ai/assistente', { pergunta }).then((r) => r.data),
};
