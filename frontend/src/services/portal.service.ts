/**
 * portal.service.ts
 * Chamadas do portal do cliente (sempre referentes ao cliente logado).
 */
import type { CustomerProfile, MembershipInfo, Paginated, Stay } from '../types';
import { api } from './api';

export const portalService = {
  getProfile: () => api.get<CustomerProfile>('/portal/perfil').then((r) => r.data),
  updateProfile: (data: { nome?: string; telefone?: string | null; cpf?: string | null }) =>
    api.put<CustomerProfile>('/portal/perfil', data).then((r) => r.data),
  changePassword: (data: { senhaAtual?: string; novaSenha: string }) => api.put('/portal/senha', data),
  listStays: (page = 1, pageSize = 10) =>
    api.get<Paginated<Stay>>('/portal/estadias', { params: { page, pageSize } }).then((r) => r.data),
  getMembership: () => api.get<MembershipInfo>('/portal/mensalidade').then((r) => r.data),
};
