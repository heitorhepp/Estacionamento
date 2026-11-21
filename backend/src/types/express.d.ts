/**
 * express.d.ts
 * Acrescenta o campo "user" ao Request do Express, preenchido pelo middleware
 * authenticate depois de validar o JWT.
 */
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export {};
