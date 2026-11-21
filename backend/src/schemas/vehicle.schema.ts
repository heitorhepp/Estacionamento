/**
 * vehicle.schema.ts
 * Validação dos veículos cadastrados (pelo cliente no portal ou pela equipe no painel).
 */
import { z } from 'zod';
import { plateSchema, vehicleTypeSchema } from './common.schema';

export const createVehicleSchema = z.object({
  placa: plateSchema,
  modelo: z.string().trim().min(1, 'Informe o modelo.').max(50),
  cor: z.string().trim().min(1, 'Informe a cor.').max(30),
  tipo: vehicleTypeSchema,
  /** Obrigatório quando quem cadastra é a equipe; ignorado para CLIENTE (usa o próprio). */
  clienteId: z.uuid('Cliente inválido.').optional(),
});

export const updateVehicleSchema = createVehicleSchema.omit({ clienteId: true }).partial();

export const listVehiclesQuerySchema = z.object({
  clienteId: z.uuid('Cliente inválido.').optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
