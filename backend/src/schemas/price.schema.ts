/**
 * price.schema.ts
 * Validação da tabela de preços (uma linha por tipo de veículo).
 */
import { z } from 'zod';
import { moneySchema, vehicleTypeSchema } from './common.schema';

export const priceParamsSchema = z.object({ tipoVeiculo: vehicleTypeSchema });

export const upsertPriceSchema = z
  .object({
    toleranciaMinutos: z.number().int('Use minutos inteiros.').min(0).max(240, 'Tolerância máxima de 240 minutos.'),
    valorPrimeiraHora: moneySchema,
    valorHoraAdicional: moneySchema,
    valorDiaria: moneySchema,
  })
  .refine((data) => data.valorDiaria >= data.valorPrimeiraHora, {
    message: 'A diária não pode ser menor que a primeira hora.',
    path: ['valorDiaria'],
  });

export type UpsertPriceInput = z.infer<typeof upsertPriceSchema>;
