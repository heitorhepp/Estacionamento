/**
 * portal.schema.ts
 * Validação das rotas do portal do cliente (perfil, senha, estadias).
 */
import { z } from 'zod';
import { cpfSchema, nameSchema, paginationShape, passwordSchema, phoneSchema } from './common.schema';

/** O email não é editável pelo cliente: ele é a chave da vinculação com o Google. */
export const updateProfileSchema = z.object({
  nome: nameSchema.optional(),
  telefone: phoneSchema,
  cpf: cpfSchema,
});

/** Quem só tem login Google define a senha sem informar a atual (regra 15). */
export const changePasswordSchema = z.object({
  senhaAtual: z.string().optional(),
  novaSenha: passwordSchema,
});

export const listStaysQuerySchema = z.object(paginationShape);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ListStaysQuery = z.infer<typeof listStaysQuerySchema>;
