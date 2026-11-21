/**
 * dashboard.routes.ts
 * Rota do dashboard — exclusiva do ADMIN.
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { dashboardQuerySchema } from '../schemas/dashboard.schema';

const router = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Cards e gráficos do ADMIN (sem movimentações canceladas)
 *     description: Período padrão = últimos 30 dias. Máximo de 1 ano.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: dataInicio, in: query, schema: { type: string, example: '2026-10-22' } }
 *       - { name: dataFim, in: query, schema: { type: string, example: '2026-11-20' } }
 *     responses:
 *       200:
 *         description: Indicadores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodo: { type: object }
 *                 cards:
 *                   type: object
 *                   description: ocupacao, veiculosNoPatio, faturamentoHoje, faturamentoMes, tempoMedioPermanenciaMinutos, mensalistasVencidos
 *                 graficos:
 *                   type: object
 *                   description: faturamentoDiario, movimentoPorHora, receitaPorOrigem
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', authenticate, authorize(Role.ADMIN), validate(dashboardQuerySchema, 'query'), dashboardController.get);

export default router;
