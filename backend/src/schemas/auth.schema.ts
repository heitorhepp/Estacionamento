/**
 * auth.schema.ts
 * Validação do login e do cadastro público do cliente.
 */
import { z } from 'zod';
import { cpfSchema, emailSchema, nameSchema, passwordSchema, phoneSchema } from './common.schema';

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Informe a senha.'),
});

/** Cadastro público: sempre cria um CLIENTE (funcionário não se cadastra — regra 16). */
export const registerSchema = z.object({
  nome: nameSchema,
  email: emailSchema,
  senha: passwordSchema,
  telefone: phoneSchema,
  cpf: cpfSchema,
});

/** "credential" é o ID token (JWT do Google) devolvido pelo botão do @react-oauth/google. */
export const googleLoginSchema = z.object({
  credential: z.string().min(1, 'Token do Google ausente.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
