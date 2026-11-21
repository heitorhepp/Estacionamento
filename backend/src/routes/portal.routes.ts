/**
 * portal.routes.ts
 * Rotas do portal do cliente — exclusivas do papel CLIENTE.
 * (Os veículos do cliente usam /veiculos, que já filtra pelo dono.)
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import * as portalController from '../controllers/portal.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { changePasswordSchema, listStaysQuerySchema, updateProfileSchema } from '../schemas/portal.schema';

const router = Router();

router.use(authenticate, authorize(Role.CLIENTE));

/**
 * @openapi
 * /portal/perfil:
 *   get:
 *     tags: [Portal do cliente]
 *     summary: Perfil do cliente logado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Perfil (User + cpf, telefone, mensalista)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   put:
 *     tags: [Portal do cliente]
 *     summary: Atualiza nome, telefone e CPF
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome: { type: string }
 *               telefone: { type: string, nullable: true }
 *               cpf: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Perfil atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/perfil', portalController.getProfile);
router.put('/perfil', validate(updateProfileSchema), portalController.updateProfile);

/**
 * @openapi
 * /portal/senha:
 *   put:
 *     tags: [Portal do cliente]
 *     summary: Define ou altera a senha (conta só Google define sem a senha atual)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [novaSenha]
 *             properties:
 *               senhaAtual: { type: string }
 *               novaSenha: { type: string, minLength: 8 }
 *     responses:
 *       204: { description: Senha salva }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.put('/senha', validate(changePasswordSchema), portalController.changePassword);

/**
 * @openapi
 * /portal/estadias:
 *   get:
 *     tags: [Portal do cliente]
 *     summary: Histórico de estadias dos meus veículos (com tempo e valor)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/PageSize'
 *     responses:
 *       200:
 *         description: Página de estadias
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Paginated' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/estadias', validate(listStaysQuerySchema, 'query'), portalController.listStays);

/**
 * @openapi
 * /portal/mensalidade:
 *   get:
 *     tags: [Portal do cliente]
 *     summary: Situação da mensalidade, próximo vencimento e pagamentos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Mensalidade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 situacao: { type: string, enum: [EM_DIA, VENCIDA, NAO_MENSALISTA] }
 *                 valorMensal: { type: string, nullable: true }
 *                 dataVencimento: { type: string, nullable: true, example: '2026-12-20' }
 *                 pagamentos: { type: array, items: { $ref: '#/components/schemas/Payment' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/mensalidade', portalController.getMembership);

export default router;
