/**
 * api.ts
 * Instância do axios usada por todos os services.
 * - Request: adiciona "Authorization: Bearer <token>" lendo o token da store Zustand.
 * - Response: em 401 (token expirado/inválido), faz logout automático; as rotas
 *   protegidas então redirecionam para o login.
 */
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api',
  timeout: 60_000, // a análise de foto pela IA pode levar alguns segundos
});

api.interceptors.request.use((config) => {
  // getState() lê a store fora de componentes React.
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { token, logout } = useAuthStore.getState();
    // Só desloga se havia sessão: um 401 no próprio login é "senha errada", não "sessão expirada".
    if (error.response?.status === 401 && token) {
      logout();
      toast.error('Sua sessão expirou. Entre novamente.', { id: 'session-expired' });
    }
    return Promise.reject(error);
  },
);
