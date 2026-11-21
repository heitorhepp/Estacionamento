/**
 * authStore.ts
 * Estado global de autenticação com Zustand: usuário logado, token, login e logout.
 *
 * O middleware "persist" salva token e usuário no localStorage, então a sessão
 * sobrevive a um F5. O interceptor do axios (services/api.ts) lê o token daqui.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  /** Guarda a sessão depois de um login bem-sucedido (email/senha ou Google). */
  login: (auth: AuthResponse) => void;
  /** Encerra a sessão (botão sair ou token expirado). */
  logout: () => void;
  /** Atualiza dados do usuário (ex.: nome editado no perfil). */
  updateUser: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: ({ token, usuario }) => set({ token, user: usuario }),
      logout: () => set({ token: null, user: null }),
      updateUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
    }),
    { name: 'parkflow-auth' },
  ),
);
