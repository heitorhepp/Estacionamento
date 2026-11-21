/**
 * portal.controller.ts
 * Handlers HTTP do portal do cliente. Sempre usa req.user.id (do token),
 * nunca um id vindo da URL — o cliente só acessa os próprios dados (regra 13).
 */
import { Request, Response } from 'express';
import * as portalService from '../services/portal.service';
import { ListStaysQuery } from '../schemas/portal.schema';

/** GET /portal/perfil */
export async function getProfile(req: Request, res: Response) {
  res.json(await portalService.getProfile(req.user!.id));
}

/** PUT /portal/perfil */
export async function updateProfile(req: Request, res: Response) {
  res.json(await portalService.updateProfile(req.user!.id, req.body));
}

/** PUT /portal/senha */
export async function changePassword(req: Request, res: Response) {
  await portalService.changePassword(req.user!.id, req.body);
  res.status(204).send();
}

/** GET /portal/estadias */
export async function listStays(req: Request, res: Response) {
  res.json(await portalService.listStays(req.user!.id, req.query as unknown as ListStaysQuery));
}

/** GET /portal/mensalidade */
export async function getMembership(req: Request, res: Response) {
  res.json(await portalService.getMembership(req.user!.id));
}
