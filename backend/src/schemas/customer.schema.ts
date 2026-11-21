/**
 * customer.schema.ts
 * Validação do CRUD de clientes/mensalistas (painel) e do pagamento de mensalidade.
 */
import { z } from 'zod';
import {
  cpfSchema,
  dateKeySchema,
  emailSchema,
  moneySchema,
  nameSchema,
  paginationShape,
  passwordSchema,
  phoneSchema,
  queryBooleanSchema,
} from './common.schema';

const customerShape = {
  nome: nameSchema,
  email: emailSchema,
  telefone: phoneSchema,
  cpf: cpfSchema,
  mensalista: z.boolean(),
  valorMensal: moneySchema.positive('O valor da mensalidade deve ser maior que zero.').nullish(),
  dataVencimento: dateKeySchema.nullish(),
};

/**
 * Criação pelo painel. A senha é opcional: sem ela, o cliente pode entrar com o
 * Google usando o mesmo email (a conta é vinculada — regra 15).
 */
export const createCustomerSchema = z
  .object({ ...customerShape, mensalista: customerShape.mensalista.default(false), senha: passwordSchema.optional() })
  .refine((data) => !data.mensalista || data.valorMensal != null, {
    message: 'Informe o valor da mensalidade.',
    path: ['valorMensal'],
  });

/** Edição: tudo opcional (a regra do valor mensal é checada no service, com os dados atuais). */
export const updateCustomerSchema = z.object(customerShape).partial();

export const listCustomersQuerySchema = z.object({
  busca: z.string().trim().optional(),
  mensalista: queryBooleanSchema.optional(),
  situacao: z.enum(['EM_DIA', 'VENCIDA', 'NAO_MENSALISTA']).optional(),
  ...paginationShape,
});

/** Pagamento de mensalidade (regra 12). Sem "valor", usa o valorMensal do cliente. */
export const registerPaymentSchema = z.object({
  referenciaMes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato AAAA-MM (ex.: 2026-11).'),
  valor: moneySchema.positive('O valor deve ser maior que zero.').optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
