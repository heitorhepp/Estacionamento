/**
 * auth.controller.ts
 * Recebe as requisições de autenticação e delega ao auth.service.
 * Controllers são finos: leem req, chamam o service e respondem. Sem regra de negócio.
 */
import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

/** POST /auth/login */
export async function login(req: Request, res: Response) {
  res.json(await authService.login(req.body));
}

/** POST /auth/cadastro — cadastro público do cliente. */
export async function register(req: Request, res: Response) {
  res.status(201).json(await authService.registerCustomer(req.body));
}

/** POST /auth/google — login social do cliente. */
export async function google(req: Request, res: Response) {
  res.json(await authService.loginWithGoogle(req.body.credential));
}

/** GET /auth/me — usuário logado. */
export async function me(req: Request, res: Response) {
  res.json(await authService.getCurrentUser(req.user!.id));
}
