/**
 * vehicle.controller.ts
 * Handlers HTTP de veículos (cliente no portal ou equipe no painel).
 */
import { Request, Response } from 'express';
import * as vehicleService from '../services/vehicle.service';
import { ListVehiclesQuery } from '../schemas/vehicle.schema';

/** GET /veiculos */
export async function list(req: Request, res: Response) {
  res.json(await vehicleService.listVehicles(req.user!, req.query as unknown as ListVehiclesQuery));
}

/** POST /veiculos */
export async function create(req: Request, res: Response) {
  res.status(201).json(await vehicleService.createVehicle(req.user!, req.body));
}

/** PUT /veiculos/:id */
export async function update(req: Request, res: Response) {
  res.json(await vehicleService.updateVehicle(req.user!, req.params.id as string, req.body));
}

/** POST /veiculos/:id/foto (multipart, campo "foto") */
export async function uploadPhoto(req: Request, res: Response) {
  res.json(await vehicleService.setVehiclePhoto(req.user!, req.params.id as string, req.file));
}

/** DELETE /veiculos/:id */
export async function remove(req: Request, res: Response) {
  await vehicleService.deleteVehicle(req.user!, req.params.id as string);
  res.status(204).send();
}
