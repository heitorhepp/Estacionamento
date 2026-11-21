/**
 * employee.service.ts
 * Chamadas do CRUD de funcionários (ADMIN).
 */
import type { Employee } from '../types';
import { api } from './api';

export interface EmployeePayload {
  nome: string;
  email: string;
  senha?: string;
  role: 'ADMIN' | 'OPERADOR';
}

export const employeeService = {
  list: () => api.get<Employee[]>('/funcionarios').then((r) => r.data),
  create: (data: EmployeePayload) => api.post<Employee>('/funcionarios', data).then((r) => r.data),
  update: (id: string, data: Partial<EmployeePayload>) => api.put<Employee>(`/funcionarios/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/funcionarios/${id}`),
};
