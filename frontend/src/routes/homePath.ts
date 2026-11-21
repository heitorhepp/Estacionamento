/**
 * homePath.ts
 * Página inicial de cada papel após o login.
 */
import type { Role } from '../types';

export function homePath(role: Role): string {
  if (role === 'ADMIN') return '/painel/dashboard';
  if (role === 'OPERADOR') return '/painel/mapa';
  return '/portal';
}
