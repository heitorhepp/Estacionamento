/**
 * customer.routes.ts
 * Rotas de clientes/mensalistas e pagamentos de mensalidade (ADMIN e OPERADOR).
 */
import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { authenticate } from '../middlewares/auth';
import { STAFF_ROLES, authorize } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  registerPaymentSchema,
  updateCustomerSchema,
} from '../schemas/customer.schema';

const router = Router();

router.use(authenticate, authorize(...STAFF_ROLES));

/**
 * @openapi
 * /clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Lista clientes com busca, filtros e paginação
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: busca, in: query, schema: { type: string }, description: Nome, email ou CPF }
 *       - { name: mensalista, in: query, schema: { type: string, enum: ['true', 'false'] } }
 *       - { name: situacao, in: query, schema: { type: string, enum: [EM_DIA, VENCIDA, NAO_MENSALISTA] } }
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/PageSize'
 *     responses:
 *       200:
 *         description: Página de clientes (data = Customer[])
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Paginated' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Clientes]
 *     summary: Cria cliente/mensalista pelo painel
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CustomerInput' }
 *     responses:
 *       201:
 *         description: Cliente criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Customer' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/', validate(listCustomersQuerySchema, 'query'), customerController.list);
router.post('/', validate(createCustomerSchema), customerController.create);

/**
 * @openapi
 * /clientes/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Detalhe do cliente com veículos e pagamentos
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Cliente
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Customer' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Clientes]
 *     summary: Atualiza cliente (todos os campos opcionais)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CustomerInput' }
 *     responses:
 *       200:
 *         description: Cliente atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Customer' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   delete:
 *     tags: [Clientes]
 *     summary: Exclui cliente (bloqueado se houver pagamentos de mensalidade)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       204: { description: Excluído }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/:id', validate(idParamSchema, 'params'), customerController.getById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateCustomerSchema), customerController.update);
router.delete('/:id', validate(idParamSchema, 'params'), customerController.remove);

/**
 * @openapi
 * /clientes/{id}/pagamentos:
 *   get:
 *     tags: [Clientes]
 *     summary: Histórico de pagamentos de mensalidade
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       200:
 *         description: Pagamentos (mais recente primeiro)
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Payment' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     tags: [Clientes]
 *     summary: Registra pagamento de mensalidade e avança o vencimento em 1 mês
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PaymentInput' }
 *     responses:
 *       201:
 *         description: Pagamento registrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Payment' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/:id/pagamentos', validate(idParamSchema, 'params'), customerController.listPayments);
router.post(
  '/:id/pagamentos',
  validate(idParamSchema, 'params'),
  validate(registerPaymentSchema),
  customerController.registerPayment,
);

export default router;
