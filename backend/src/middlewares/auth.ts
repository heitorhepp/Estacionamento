/**
 * auth.ts
 * Middleware de autenticação: exige um JWT válido no header
 * "Authorization: Bearer <token>" e coloca { id, role } em req.user.
 */
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/** Conteúdo do token emitido em auth.service (sub = id do usuário). */
interface TokenPayload {
  sub: string;
  role: Role;
}

/**
 * Valida o token e identifica o usuário da requisição.
 * Lança 401 se o token estiver ausente, inválido ou expirado.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Você precisa estar logado para acessar este recurso.', 401);
  }

  try {
    const payload = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET) as TokenPayload;
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    throw new AppError('Sessão inválida ou expirada. Faça login novamente.', 401);
  }
  next();
}
