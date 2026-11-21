/**
 * customer.service.ts
 * Chamadas de clientes/mensalistas e pagamentos de mensalidade (painel).
 */
import type { Customer, MembershipStatus, Paginated, Payment } from '../types';
import { api } from './api';

export interface CustomerPayload {
  nome: string;
  email: string;
  telefone?: string | null;
  cpf?: string | null;
  senha?: string;
  mensalista: boolean;
  valorMensal?: number | null;
  dataVencimento?: string | null;
}

export interface CustomerFilters {
  busca?: string;
  situacao?: MembershipStatus;
  page?: number;
  pageSize?: number;
}

export const customerService = {
  list: (params: CustomerFilters) => api.get<Paginated<Customer>>('/clientes', { params }).then((r) => r.data),
  get: (id: string) => api.get<Customer>(`/clientes/${id}`).then((r) => r.data),
  create: (data: CustomerPayload) => api.post<Customer>('/clientes', data).then((r) => r.data),
  update: (id: string, data: Partial<CustomerPayload>) => api.put<Customer>(`/clientes/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/clientes/${id}`),
  registerPayment: (id: string, data: { referenciaMes: string; valor?: number }) =>
    api.post<Payment & { novoVencimento: string }>(`/clientes/${id}/pagamentos`, data).then((r) => r.data),
};
