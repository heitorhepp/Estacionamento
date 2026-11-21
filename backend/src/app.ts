/**
 * app.ts
 * Monta a aplicação Express: CORS, parser de JSON, documentação Swagger, rotas e tratamento de erros.
 * Fica separado do server.ts para que o app possa ser importado em testes sem abrir porta.
 */
import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import routes from './routes';

// Mensagens padrão do Zod em português; campo ausente vira "Campo obrigatório.".
z.config(z.locales.pt());
z.config({
  customError: (issue) => (issue.code === 'invalid_type' && issue.input === undefined ? 'Campo obrigatório.' : undefined),
});

export const app = express();

// Só o front configurado em FRONTEND_URL pode chamar a API pelo navegador.
app.use(cors({ origin: env.FRONTEND_URL.split(',').map((url) => url.trim()) }));
app.use(express.json({ limit: '1mb' }));

// Documentação interativa em /api-docs e a especificação crua em /api-docs.json.
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'API Estacionamento' }));

app.use('/api', routes);

// Precisam ser os últimos: rota inexistente → 404; qualquer erro → errorHandler.
app.use(notFoundHandler);
app.use(errorHandler);
