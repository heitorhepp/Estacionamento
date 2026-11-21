/**
 * vehicle.service.ts
 * Chamadas de veículos (portal do cliente e painel) e envio da foto.
 */
import type { Vehicle, VehicleType } from '../types';
import { api } from './api';

export interface VehiclePayload {
  placa: string;
  modelo: string;
  cor: string;
  tipo: VehicleType;
}

export const vehicleService = {
  list: () => api.get<Vehicle[]>('/veiculos').then((r) => r.data),
  create: (data: VehiclePayload) => api.post<Vehicle>('/veiculos', data).then((r) => r.data),
  update: (id: string, data: Partial<VehiclePayload>) => api.put<Vehicle>(`/veiculos/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/veiculos/${id}`),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('foto', file);
    return api.post<Vehicle>(`/veiculos/${id}/foto`, form).then((r) => r.data);
  },
};
