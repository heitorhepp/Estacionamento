/**
 * env.ts
 * Carrega e valida as variáveis de ambiente na inicialização.
 * Se algo obrigatório estiver faltando, a aplicação para logo de cara com uma
 * mensagem clara — melhor do que quebrar no meio de uma requisição.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter pelo menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  FRONTEND_URL: z.string().min(1).default('http://localhost:5173'),

  // Integrações: opcionais para a API subir mesmo sem as chaves (ex.: rodar só o CRUD).
  // Quando faltam, o recurso correspondente responde 503 com uma mensagem clara.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

/** Variáveis de ambiente já validadas e tipadas. */
export const env = parsed.data;
