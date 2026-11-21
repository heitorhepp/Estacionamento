/**
 * errorHandler.ts
 * Tratamento de erros CENTRALIZADO. Toda exceção lançada em rotas, middlewares
 * ou services chega aqui (o Express 5 já repassa erros de funções async) e vira
 * uma resposta JSON { message, errors? } com o status HTTP correto.
 */
import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/** Mensagens para violação de campo único (erro P2002 do Prisma), por campo. */
const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  email: 'Este email já está cadastrado.',
  cpf: 'Este CPF já está cadastrado.',
  placa: 'Esta placa já está cadastrada.',
  codigo: 'Já existe uma vaga com este código.',
  googleId: 'Esta conta Google já está vinculada a outro usuário.',
  tipoVeiculo: 'Já existe uma tabela de preço para este tipo de veículo.',
};

/**
 * Converte erros conhecidos do Prisma em AppError com status adequado.
 * @returns AppError equivalente ou null se o erro não for tratado aqui.
 */
function fromPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError | null {
  switch (err.code) {
    case 'P2002': {
      // "target" pode vir como lista de campos ou nome do índice.
      const target = err.meta?.target;
      const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
      const field = Object.keys(UNIQUE_FIELD_MESSAGES).find((f) => fields.some((t) => t.includes(f)));
      return new AppError(field ? UNIQUE_FIELD_MESSAGES[field] : 'Já existe um registro com estes dados.', 409);
    }
    case 'P2025':
      return new AppError('Registro não encontrado.', 404);
    case 'P2003':
      return new AppError('Operação não permitida: existem registros vinculados a este item.', 409);
    case 'P2034':
      // Conflito entre transações simultâneas (isolamento Serializable).
      return new AppError('Outra operação alterou estes dados ao mesmo tempo. Tente novamente.', 409);
    default:
      return null;
  }
}

/** Responde 404 para qualquer rota não registrada. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, 404));
}

/** Middleware final de erros (precisa ter 4 parâmetros para o Express reconhecê-lo). */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    err = fromPrismaError(err) ?? err;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Verifique os dados informados.',
      errors: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  // Erros do Multer (upload): arquivo grande demais → 413; demais (campo errado etc.) → 400.
  if (err instanceof MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      message: tooLarge ? 'A imagem deve ter no máximo 5 MB.' : 'Envie uma única imagem no campo "foto".',
    });
    return;
  }

  // JSON malformado no corpo da requisição (gerado pelo express.json()).
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'O corpo da requisição não é um JSON válido.' });
    return;
  }

  // Corpo maior que o limite do express.json().
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ message: 'O conteúdo enviado é grande demais.' });
    return;
  }

  // Erro inesperado: loga os detalhes no servidor, mas não expõe ao cliente.
  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor. Tente novamente em instantes.' });
};
