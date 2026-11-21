/**
 * common.schema.ts
 * Peças de validação Zod reaproveitadas por vários recursos
 * (email, senha, placa, CPF, datas, dinheiro, paginação).
 */
import { z } from 'zod';
import { TipoVeiculo } from '@prisma/client';
import { isValidPlate, normalizePlate } from '../utils/plate';

/** Parâmetro :id das rotas (UUID). */
export const idParamSchema = z.object({ id: z.uuid('ID inválido.') });

/** Email: remove espaços e converte para minúsculas ANTES de validar. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Email inválido.'));

/** Senha: mínimo de 8 caracteres (regra 14). O bcrypt só considera 72 bytes. */
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres.');

export const nameSchema = z.string().trim().min(2, 'Informe o nome.').max(100, 'Nome muito longo.');

export const phoneSchema = z.string().trim().max(20, 'Telefone muito longo.').nullish();

/** CPF opcional: guarda só os dígitos; texto vazio vira null. */
export const cpfSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value === '' || value.length === 11, 'O CPF deve ter 11 dígitos.')
  .transform((value) => (value === '' ? null : value))
  .nullish();

/** Placa: normaliza (maiúscula, sem hífen) e valida antigo/Mercosul (regra 3). */
export const plateSchema = z
  .string({ error: 'Informe a placa.' })
  .transform(normalizePlate)
  .refine(isValidPlate, 'Placa inválida. Use o formato ABC-1234 ou ABC1D23.');

export const vehicleTypeSchema = z.enum(TipoVeiculo, { error: 'O tipo deve ser CARRO ou MOTO.' });

/** Data sem hora, no formato AAAA-MM-DD. */
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.');

/** Valor em reais (ex.: 12.5). */
export const moneySchema = z
  .number({ error: 'Informe um valor numérico.' })
  .nonnegative('O valor não pode ser negativo.')
  .max(99_999_999, 'Valor muito alto.');

/** Booleano vindo da query string ("true"/"false"). */
export const queryBooleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

/** Campos de paginação para listagens. */
export const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
