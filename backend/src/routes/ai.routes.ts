/**
 * ai.routes.ts
 * Rota do assistente de IA — exclusiva do ADMIN.
 * (A leitura da foto de entrada fica em /movimentacoes/entrada/foto.)
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import * as aiController from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { askAssistantSchema } from '../schemas/ai.schema';

const router = Router();

/**
 * @openapi
 * /ai/assistente:
 *   post:
 *     tags: [IA]
 *     summary: Pergunta em linguagem natural sobre os dados do estacionamento (ADMIN)
 *     description: A IA recebe só um resumo agregado dos últimos 30 dias — nenhum dado pessoal.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pergunta]
 *             properties:
 *               pergunta: { type: string, example: Qual dia teve mais movimento esta semana? }
 *     responses:
 *       200:
 *         description: Resposta da IA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resposta: { type: string }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 *       503: { $ref: '#/components/responses/ServiceUnavailable' }
 */
router.post('/assistente', authenticate, authorize(Role.ADMIN), validate(askAssistantSchema), aiController.ask);

export default router;
