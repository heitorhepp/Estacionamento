/**
 * spot.controller.ts
 * Handlers HTTP de vagas: mapa, consulta pública de vagas livres e CRUD.
 */
import { Request, Response } from 'express';
import * as spotService from '../services/spot.service';
import { ListSpotsQuery } from '../schemas/spot.schema';

/** GET /vagas — mapa de vagas (equipe). */
export async function list(req: Request, res: Response) {
  res.json(await spotService.listSpots(req.query as unknown as ListSpotsQuery));
}

/** GET /vagas/livres — público, sem login (regra 17). */
export async function available(_req: Request, res: Response) {
  res.json(await spotService.getOccupancySummary());
}

/** POST /vagas */
export async function create(req: Request, res: Response) {
  res.status(201).json(await spotService.createSpot(req.body));
}

/** PUT /vagas/:id */
export async function update(req: Request, res: Response) {
  res.json(await spotService.updateSpot(req.params.id as string, req.body));
}

/** DELETE /vagas/:id */
export async function remove(req: Request, res: Response) {
  await spotService.deleteSpot(req.params.id as string);
  res.status(204).send();
}
