/**
 * prisma.ts
 * Instância única do Prisma Client compartilhada por toda a aplicação.
 * Criar um client por requisição abriria conexões demais com o banco.
 */
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
