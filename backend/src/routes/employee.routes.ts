/**
 * employee.routes.ts
 * Rotas de funcionários — todas exclusivas do ADMIN.
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import * as employeeController from '../controllers/employee.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/roles';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas/employee.schema';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

/**
 * @openapi
 * /funcionarios:
 *   get:
 *     tags: [Funcionários]
 *     summary: Lista funcionários (ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de funcionários
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/User' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Funcionários]
 *     summary: Cria funcionário (ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EmployeeInput' }
 *     responses:
 *       201:
 *         description: Funcionário criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/', employeeController.list);
router.post('/', validate(createEmployeeSchema), employeeController.create);

/**
 * @openapi
 * /funcionarios/{id}:
 *   put:
 *     tags: [Funcionários]
 *     summary: Atualiza funcionário (senha só muda se enviada)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EmployeeInput' }
 *     responses:
 *       200:
 *         description: Funcionário atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   delete:
 *     tags: [Funcionários]
 *     summary: Exclui funcionário (não pode a própria conta nem quem tem histórico)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/IdParam' }]
 *     responses:
 *       204: { description: Excluído }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.put('/:id', validate(idParamSchema, 'params'), validate(updateEmployeeSchema), employeeController.update);
router.delete('/:id', validate(idParamSchema, 'params'), employeeController.remove);

export default router;
