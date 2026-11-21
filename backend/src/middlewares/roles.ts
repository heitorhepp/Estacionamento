/**
 * roles.ts
 * Middleware de autorização por papel (ADMIN, OPERADOR, CLIENTE).
 * Deve ser usado DEPOIS de authenticate.
 */
import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';

/** Papéis do painel interno, usados em várias rotas. */
export const STAFF_ROLES: Role[] = [Role.ADMIN, Role.OPERADOR];

/**
 * Cria um middleware que só deixa passar os papéis informados.
 * @param roles Papéis permitidos.
 * @returns Middleware que lança 403 para os demais.
 * @example router.get('/', authenticate, authorize(Role.ADMIN), handler)
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('Você precisa estar logado para acessar este recurso.', 401);
    if (!roles.includes(req.user.role)) {
      throw new AppError('Você não tem permissão para acessar este recurso.', 403);
    }
    next();
  };
}
