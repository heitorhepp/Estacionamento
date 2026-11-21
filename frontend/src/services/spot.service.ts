/**
 * spot.service.ts
 * Chamadas de vagas: mapa, vagas livres (público) e CRUD.
 */
import type { Occupancy, Spot, VehicleType } from '../types';
import { api } from './api';

export interface SpotPayload {
  codigo: string;
  tipo: VehicleType;
  setor: string;
  ativa: boolean;
}

export const spotService = {
  list: (params?: { tipo?: VehicleType; setor?: string }) => api.get<Spot[]>('/vagas', { params }).then((r) => r.data),
  available: () => api.get<Occupancy[]>('/vagas/livres').then((r) => r.data),
  create: (data: SpotPayload) => api.post<Spot>('/vagas', data).then((r) => r.data),
  update: (id: string, data: Partial<SpotPayload>) => api.put<Spot>(`/vagas/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/vagas/${id}`),
};
