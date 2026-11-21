/**
 * employee.schema.ts
 * Validação do CRUD de funcionários (ADMIN e OPERADOR), feito só pelo ADMIN.
 */
import { z } from 'zod';
import { Role } from '@prisma/client';
import { emailSchema, nameSchema, passwordSchema } from './common.schema';

const staffRoleSchema = z.enum([Role.ADMIN, Role.OPERADOR], { error: 'O perfil deve ser ADMIN ou OPERADOR.' });

export const createEmployeeSchema = z.object({
  nome: nameSchema,
  email: emailSchema,
  senha: passwordSchema,
  role: staffRoleSchema,
});

/** Na edição tudo é opcional; a senha só muda se for enviada. */
export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
