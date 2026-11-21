/**
 * movement.schema.ts
 * Validação de entrada, edição, saída, cancelamento e listagem de movimentações.
 */
import { z } from 'zod';
import { FormaPagamento, StatusMovimentacao } from '@prisma/client';
import { normalizePlate } from '../utils/plate';
import { dateKeySchema, paginationShape, plateSchema, vehicleTypeSchema } from './common.schema';

const vehicleDataShape = {
  placa: plateSchema,
  modelo: z.string().trim().min(1, 'Informe o modelo.').max(50),
  cor: z.string().trim().min(1, 'Informe a cor.').max(30),
  avariasObservadas: z.string().trim().max(500, 'Máximo de 500 caracteres.').nullish(),
};

/**
 * Registro de entrada. A foto é enviada antes (upload/análise pela IA, Etapa 3),
 * e aqui chega apenas a URL já salva no Cloudinary.
 */
export const registerEntrySchema = z.object({
  ...vehicleDataShape,
  tipoVeiculo: vehicleTypeSchema,
  vagaId: z.uuid('Selecione uma vaga válida.'),
  fotoEntradaUrl: z.url('URL da foto inválida.').nullish(),
});

/** Edição de uma movimentação ABERTA (regra 10): só dados descritivos do veículo. */
export const updateMovementSchema = z.object(vehicleDataShape).partial();

/** Confirmação de saída: forma de pagamento é exigida só quando há valor a pagar. */
export const confirmExitSchema = z.object({
  formaPagamento: z.enum(FormaPagamento, { error: 'Forma de pagamento inválida.' }).optional(),
});

export const cancelMovementSchema = z.object({
  motivo: z.string().trim().min(3, 'Informe o motivo do cancelamento.').max(300),
});

export const listMovementsQuerySchema = z.object({
  /** Busca parcial (ex.: "ABC" encontra ABC1234). */
  placa: z.string().transform(normalizePlate).optional(),
  status: z.enum(StatusMovimentacao).optional(),
  dataInicio: dateKeySchema.optional(),
  dataFim: dateKeySchema.optional(),
  ...paginationShape,
});

export type RegisterEntryInput = z.infer<typeof registerEntrySchema>;
export type UpdateMovementInput = z.infer<typeof updateMovementSchema>;
export type ConfirmExitInput = z.infer<typeof confirmExitSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
