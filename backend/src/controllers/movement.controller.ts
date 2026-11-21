/**
 * movement.controller.ts
 * Handlers HTTP de movimentações: entrada, edição, saída em dois passos,
 * cancelamento e histórico.
 */
import { Request, Response } from 'express';
import * as movementService from '../services/movement.service';
import { ListMovementsQuery } from '../schemas/movement.schema';

/** GET /movimentacoes */
export async function list(req: Request, res: Response) {
  res.json(await movementService.listMovements(req.query as unknown as ListMovementsQuery));
}

/** GET /movimentacoes/:id */
export async function getById(req: Request, res: Response) {
  res.json(await movementService.getMovementById(req.params.id as string));
}

/** POST /movimentacoes/entrada/foto (multipart, campo "foto") — upload + sugestões da IA. */
export async function analyzePhoto(req: Request, res: Response) {
  res.json(await movementService.analyzeEntryPhoto(req.file));
}

/** POST /movimentacoes/entrada */
export async function registerEntry(req: Request, res: Response) {
  res.status(201).json(await movementService.registerEntry(req.user!.id, req.body));
}

/** PUT /movimentacoes/:id */
export async function update(req: Request, res: Response) {
  res.json(await movementService.updateMovement(req.params.id as string, req.body));
}

/** GET /movimentacoes/:id/saida/previa — só calcula, não grava. */
export async function previewExit(req: Request, res: Response) {
  res.json(await movementService.previewExit(req.params.id as string));
}

/** POST /movimentacoes/:id/saida — confirma e libera a vaga. */
export async function confirmExit(req: Request, res: Response) {
  res.json(await movementService.confirmExit(req.params.id as string, req.user!.id, req.body));
}

/** POST /movimentacoes/:id/cancelar */
export async function cancel(req: Request, res: Response) {
  res.json(await movementService.cancelMovement(req.params.id as string, req.user!.id, req.body.motivo));
}
