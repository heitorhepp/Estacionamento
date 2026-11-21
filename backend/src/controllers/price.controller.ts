/**
 * price.controller.ts
 * Handlers HTTP da tabela de preços.
 */
import { Request, Response } from 'express';
import { TipoVeiculo } from '@prisma/client';
import * as priceService from '../services/price.service';

/** GET /precos */
export async function list(_req: Request, res: Response) {
  res.json(await priceService.listPrices());
}

/** PUT /precos/:tipoVeiculo */
export async function upsert(req: Request, res: Response) {
  res.json(await priceService.upsertPrice(req.params.tipoVeiculo as TipoVeiculo, req.body));
}
