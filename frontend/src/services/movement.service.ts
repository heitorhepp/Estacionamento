/**
 * movement.service.ts
 * Chamadas de movimentações: foto/IA, entrada, saída em dois passos, cancelamento e histórico.
 */
import type { ExitPreview, Movement, MovementStatus, Paginated, PaymentMethod, PhotoAnalysis, VehicleType } from '../types';
import { api } from './api';

export interface EntryPayload {
  placa: string;
  tipoVeiculo: VehicleType;
  modelo: string;
  cor: string;
  vagaId: string;
  avariasObservadas?: string | null;
  fotoEntradaUrl?: string | null;
}

export interface MovementFilters {
  placa?: string;
  status?: MovementStatus;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  pageSize?: number;
}

export const movementService = {
  list: (params: MovementFilters) => api.get<Paginated<Movement>>('/movimentacoes', { params }).then((r) => r.data),
  /** Envia a foto (multipart) e recebe a URL salva + sugestões da IA. */
  analyzePhoto: (file: File) => {
    const form = new FormData();
    form.append('foto', file);
    return api.post<PhotoAnalysis>('/movimentacoes/entrada/foto', form).then((r) => r.data);
  },
  registerEntry: (data: EntryPayload) => api.post<Movement>('/movimentacoes/entrada', data).then((r) => r.data),
  update: (id: string, data: Partial<Pick<Movement, 'placa' | 'modelo' | 'cor' | 'avariasObservadas'>>) =>
    api.put<Movement>(`/movimentacoes/${id}`, data).then((r) => r.data),
  previewExit: (id: string) => api.get<ExitPreview>(`/movimentacoes/${id}/saida/previa`).then((r) => r.data),
  /** O valor NÃO é enviado: o back-end sempre recalcula. */
  confirmExit: (id: string, formaPagamento?: PaymentMethod) =>
    api.post<Movement>(`/movimentacoes/${id}/saida`, { formaPagamento }).then((r) => r.data),
  cancel: (id: string, motivo: string) => api.post<Movement>(`/movimentacoes/${id}/cancelar`, { motivo }).then((r) => r.data),
};
