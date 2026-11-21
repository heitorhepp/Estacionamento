/**
 * price.service.ts
 * Chamadas da tabela de preços.
 */
import type { Price, VehicleType } from '../types';
import { api } from './api';

export interface PricePayload {
  toleranciaMinutos: number;
  valorPrimeiraHora: number;
  valorHoraAdicional: number;
  valorDiaria: number;
}

export const priceService = {
  list: () => api.get<Price[]>('/precos').then((r) => r.data),
  save: (tipo: VehicleType, data: PricePayload) => api.put<Price>(`/precos/${tipo}`, data).then((r) => r.data),
};
