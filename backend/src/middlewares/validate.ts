/**
 * validate.ts
 * Middleware genérico de validação com Zod.
 * Valida body, query ou params e SUBSTITUI o valor original pelo valor já
 * tratado (ex.: placa normalizada, email em minúsculas, números convertidos).
 * Se a validação falhar, o ZodError vai para o errorHandler, que responde 400.
 */
import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * @param schema Schema Zod a aplicar.
 * @param part Parte da requisição a validar (padrão: body).
 * @returns Middleware de validação.
 */
export function validate(schema: ZodType, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[part]);
    // No Express 5, req.query é somente leitura (getter); defineProperty permite substituir.
    Object.defineProperty(req, part, { value: parsed, writable: true, configurable: true, enumerable: true });
    next();
  };
}
