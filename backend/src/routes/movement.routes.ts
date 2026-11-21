/**
 * movement.routes.ts
 * Rotas de movimentações (ADMIN e OPERADOR).
 * Fluxo da entrada: POST /entrada/foto (upload + IA) → operador confirma → POST /entrada.
 * A saída tem dois passos (regra 8): GET .../saida/previa calcula; POST .../saida confirma.
 */
import { Router } from 'express';
import * as movementController from '../controllers/movement.controller';
import { authenticate } from '../middlewares/auth';
import { STAFF_ROLES, authorize } from '../middlewares/roles';
import { uploadImage } from '../middlewares/upload';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import {
  cancelMovementSchema,
  confirmExitSchema,
  listMovementsQuerySchema,
  registerEntrySchema,
  updateMovementSchema,
} from '../schemas/movement.schema';

const router = Router();

router.use(authenticate, authorize(...STAFF_ROLES));

/**
 * @openapi
 * /movimentacoes:
 *   get:
 *     tags: [Movimentações]
 *     summary: Histórico com filtros por placa, status e período (data de entrada)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: placa, in: query, schema: { type: string }, description: Busca parcial }
 *       - { name: status, in: query, schema: { type: string, enum: [ABERTA, FINALIZADA, CANCELADA] } }
 *       - { name: dataInicio, in: query, schema: { type: string, example: '2026-11-01' } }
 *       - { name: dataFim, in: query, schema: { type: string, example: '2026-11-30' } }
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/PageSize'
 *     responses:
 *       200:
 *         description: Página de movimentações (data = Movement[])
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Paginated' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', validate(listMovementsQuerySchema, 'query'), movementController.list);

/**
 * @openapi
 * /movimentacoes/entrada/foto:
 *   post:
 *     tags: [Movimentações]
 *     summary: Envia a foto de entrada (Cloudinary) e recebe sugestões da IA (Gemini)
 *     description: |
 *       Não grava a entrada. Devolve a URL da foto e os campos sugeridos para o operador
 *       confirmar. Falhas da IA ou do upload não bloqueiam: aparecem em "avisos".
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [foto]
 *             properties:
 *               foto: { type: string, format: binary, description: JPEG, PNG ou WEBP até 5 MB }
 *     responses:
 *       200:
 *         description: URL da foto e sugestões
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PhotoAnalysis' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       413: { $ref: '#/components/responses/PayloadTooLarge' }
 */
router.post('/entrada/foto', uploadImage(), movementController.analyzePhoto);

/**
 * @openapi
 * /movimentacoes/entrada:
 *   post:
 *     tags: [Movimentações]
 *     summary: Registra a entrada (vaga ativa, livre e compatível; placa sem entrada aberta)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EntryInput' }
 *     responses:
 *       201:
 *         description: Entrada registrada (preços da tabela copiados)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Movement' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/entrada', validate(registerEntrySchema), movementController.registerEntry);

/**
 * @openapi
 * /movimentacoes/{id}:
 *   get:
 *     tags: [Movimentações]
 *     summary: Detalhe da movimentação
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Movimentação
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Movement' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Movimentações]
 *     summary: Edita placa/modelo/cor/avarias (só movimentação ABERTA)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               placa: { type: string }
 *               modelo: { type: string }
 *               cor: { type: string }
 *               avariasObservadas: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Movimentação atualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Movement' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/:id', validate(idParamSchema, 'params'), movementController.getById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateMovementSchema), movementController.update);

/**
 * @openapi
 * /movimentacoes/{id}/saida/previa:
 *   get:
 *     tags: [Movimentações]
 *     summary: Passo 1 da saída — calcula o valor sem gravar nada
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Pré-visualização
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ExitPreview' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/:id/saida/previa', validate(idParamSchema, 'params'), movementController.previewExit);

/**
 * @openapi
 * /movimentacoes/{id}/saida:
 *   post:
 *     tags: [Movimentações]
 *     summary: Passo 2 da saída — recalcula no servidor, grava valor e forma de pagamento, libera a vaga
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               formaPagamento:
 *                 type: string
 *                 enum: [PIX, DINHEIRO, CARTAO]
 *                 description: Obrigatória quando há valor a pagar (mensalista em dia é automático)
 *     responses:
 *       200:
 *         description: Movimentação finalizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Movement' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/:id/saida', validate(idParamSchema, 'params'), validate(confirmExitSchema), movementController.confirmExit);

/**
 * @openapi
 * /movimentacoes/{id}/cancelar:
 *   post:
 *     tags: [Movimentações]
 *     summary: Cancela entrada lançada por engano (motivo obrigatório) e libera a vaga
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motivo]
 *             properties:
 *               motivo: { type: string, example: Placa digitada errada }
 *     responses:
 *       200:
 *         description: Movimentação cancelada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Movement' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/:id/cancelar', validate(idParamSchema, 'params'), validate(cancelMovementSchema), movementController.cancel);

export default router;
