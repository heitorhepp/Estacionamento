/**
 * spot.routes.ts
 * Rotas de vagas: consulta pública de vagas livres, mapa (equipe) e CRUD (ADMIN).
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import * as spotController from '../controllers/spot.controller';
import { authenticate } from '../middlewares/auth';
import { STAFF_ROLES, authorize } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createSpotSchema, listSpotsQuerySchema, updateSpotSchema } from '../schemas/spot.schema';

const router = Router();

/**
 * @openapi
 * /vagas/livres:
 *   get:
 *     tags: [Vagas]
 *     summary: Vagas livres por tipo (PÚBLICO, sem login)
 *     responses:
 *       200:
 *         description: Ocupação por tipo de veículo
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Occupancy' } }
 */
// Pública (regra 17) — declarada ANTES do authenticate.
router.get('/livres', spotController.available);

router.use(authenticate);

/**
 * @openapi
 * /vagas:
 *   get:
 *     tags: [Vagas]
 *     summary: Mapa de vagas com status (LIVRE, OCUPADA, INATIVA)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: setor, in: query, schema: { type: string } }
 *       - { name: tipo, in: query, schema: { type: string, enum: [CARRO, MOTO] } }
 *     responses:
 *       200:
 *         description: Vagas ordenadas por setor e código
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Spot' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Vagas]
 *     summary: Cria vaga (ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SpotInput' }
 *     responses:
 *       201:
 *         description: Vaga criada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Spot' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/', authorize(...STAFF_ROLES), validate(listSpotsQuerySchema, 'query'), spotController.list);
router.post('/', authorize(Role.ADMIN), validate(createSpotSchema), spotController.create);

/**
 * @openapi
 * /vagas/{id}:
 *   put:
 *     tags: [Vagas]
 *     summary: Atualiza vaga (ADMIN). Vaga ocupada não pode ser desativada nem mudar de tipo.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SpotInput' }
 *     responses:
 *       200:
 *         description: Vaga atualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Spot' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   delete:
 *     tags: [Vagas]
 *     summary: Exclui vaga (ADMIN). Bloqueado se ocupada ou com histórico.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       204: { description: Excluída }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.put('/:id', authorize(Role.ADMIN), validate(idParamSchema, 'params'), validate(updateSpotSchema), spotController.update);
router.delete('/:id', authorize(Role.ADMIN), validate(idParamSchema, 'params'), spotController.remove);

export default router;
