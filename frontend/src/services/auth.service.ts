/**
 * auth.service.ts
 * Chamadas de autenticação: login (email/senha e Google) e cadastro do cliente.
 */
import type { AuthResponse } from '../types';
import { api } from './api';

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cpf?: string;
}

export const authService = {
  login: (email: string, senha: string) => api.post<AuthResponse>('/auth/login', { email, senha }).then((r) => r.data),
  register: (data: RegisterPayload) => api.post<AuthResponse>('/auth/cadastro', data).then((r) => r.data),
  /** @param credential ID token devolvido pelo botão do Google. */
  google: (credential: string) => api.post<AuthResponse>('/auth/google', { credential }).then((r) => r.data),
};
