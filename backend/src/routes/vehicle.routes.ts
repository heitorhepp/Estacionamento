/**
 * vehicle.routes.ts
 * Rotas de veículos. Qualquer usuário logado acessa; o service restringe o
 * CLIENTE aos próprios veículos.
 */
import { Router } from 'express';
import * as vehicleController from '../controllers/vehicle.controller';
import { authenticate } from '../middlewares/auth';
import { uploadImage } from '../middlewares/upload';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createVehicleSchema, listVehiclesQuerySchema, updateVehicleSchema } from '../schemas/vehicle.schema';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /veiculos:
 *   get:
 *     tags: [Veículos]
 *     summary: Lista veículos (CLIENTE vê só os próprios)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: clienteId, in: query, schema: { type: string, format: uuid }, description: Filtro (só equipe) }
 *     responses:
 *       200:
 *         description: Veículos
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Vehicle' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Veículos]
 *     summary: Cadastra veículo
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VehicleInput' }
 *     responses:
 *       201:
 *         description: Veículo criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Vehicle' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/', validate(listVehiclesQuerySchema, 'query'), vehicleController.list);
router.post('/', validate(createVehicleSchema), vehicleController.create);

/**
 * @openapi
 * /veiculos/{id}:
 *   put:
 *     tags: [Veículos]
 *     summary: Atualiza veículo (dono ou equipe)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VehicleInput' }
 *     responses:
 *       200:
 *         description: Veículo atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Vehicle' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   delete:
 *     tags: [Veículos]
 *     summary: Exclui veículo (o histórico de estadias é mantido)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       204: { description: Excluído }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.put('/:id', validate(idParamSchema, 'params'), validate(updateVehicleSchema), vehicleController.update);
router.delete('/:id', validate(idParamSchema, 'params'), vehicleController.remove);

/**
 * @openapi
 * /veiculos/{id}/foto:
 *   post:
 *     tags: [Veículos]
 *     summary: Envia a foto do veículo (JPEG/PNG/WEBP, até 5 MB) para o Cloudinary
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [foto]
 *             properties:
 *               foto: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Veículo com fotoUrl atualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Vehicle' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       413: { $ref: '#/components/responses/PayloadTooLarge' }
 *       503: { $ref: '#/components/responses/ServiceUnavailable' }
 */
router.post('/:id/foto', validate(idParamSchema, 'params'), uploadImage(), vehicleController.uploadPhoto);

export default router;
