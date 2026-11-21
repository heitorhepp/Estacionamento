/**
 * ProtectedRoute.tsx
 * Proteção de rotas por login e por papel.
 * - Sem login → vai para /login.
 * - Logado, mas sem o papel exigido → vai para a página inicial do próprio papel.
 * Obs.: é só experiência de navegação; a segurança de verdade está no back-end,
 * que valida o token e o papel em toda requisição.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Role } from '../types';
import { homePath } from './homePath';

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;
  return <Outlet />;
}

/** Telas públicas (login/cadastro): quem já está logado vai direto para a sua home. */
export function GuestRoute() {
  const user = useAuthStore((state) => state.user);
  return user ? <Navigate to={homePath(user.role)} replace /> : <Outlet />;
}

/** "/" redireciona conforme o papel (ou para o login). */
export function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={user ? homePath(user.role) : '/login'} replace />;
}
