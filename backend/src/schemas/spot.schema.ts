/**
 * spot.schema.ts
 * Validação do CRUD de vagas.
 */
import { z } from 'zod';
import { vehicleTypeSchema } from './common.schema';

export const createSpotSchema = z.object({
  codigo: z.string().trim().toUpperCase().min(1, 'Informe o código.').max(10),
  tipo: vehicleTypeSchema,
  setor: z.string().trim().min(1, 'Informe o setor.').max(30),
  ativa: z.boolean().optional(),
});

export const updateSpotSchema = createSpotSchema.partial();

export const listSpotsQuerySchema = z.object({
  setor: z.string().trim().optional(),
  tipo: vehicleTypeSchema.optional(),
});

export type CreateSpotInput = z.infer<typeof createSpotSchema>;
export type UpdateSpotInput = z.infer<typeof updateSpotSchema>;
export type ListSpotsQuery = z.infer<typeof listSpotsQuerySchema>;
