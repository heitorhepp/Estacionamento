/**
 * price.routes.ts
 * Rotas da tabela de preços: leitura pela equipe, alteração só pelo ADMIN.
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import * as priceController from '../controllers/price.controller';
import { authenticate } from '../middlewares/auth';
import { STAFF_ROLES, authorize } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { priceParamsSchema, upsertPriceSchema } from '../schemas/price.schema';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /precos:
 *   get:
 *     tags: [Preços]
 *     summary: Tabelas de preço vigentes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Uma tabela por tipo de veículo
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/PriceInput' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', authorize(...STAFF_ROLES), priceController.list);

/**
 * @openapi
 * /precos/{tipoVeiculo}:
 *   put:
 *     tags: [Preços]
 *     summary: Cria ou atualiza a tabela de um tipo (ADMIN). Não afeta quem já está no pátio.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: tipoVeiculo, in: path, required: true, schema: { type: string, enum: [CARRO, MOTO] } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PriceInput' }
 *     responses:
 *       200:
 *         description: Tabela salva
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PriceInput' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.put(
  '/:tipoVeiculo',
  authorize(Role.ADMIN),
  validate(priceParamsSchema, 'params'),
  validate(upsertPriceSchema),
  priceController.upsert,
);

export default router;
