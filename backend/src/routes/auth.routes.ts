/**
 * auth.routes.ts
 * Rotas de autenticação: login com email/senha (funcionário e cliente), login com
 * Google (só cliente), cadastro público do cliente e "quem sou eu".
 */
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { googleLoginSchema, loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login com email e senha (funcionários e clientes)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginInput' }
 *     responses:
 *       200:
 *         description: Login realizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/cadastro:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastro público do cliente (cria Usuario CLIENTE + Cliente)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterInput' }
 *     responses:
 *       201:
 *         description: Conta criada e já logada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/cadastro', validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Login social do cliente com Google
 *     description: |
 *       Recebe o ID token do botão "Entrar com Google". Se o email já for de um cliente,
 *       vincula a conta Google a ele; se não existir, cria a conta. Email de funcionário → 403.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential: { type: string, description: ID token do Google }
 *     responses:
 *       200:
 *         description: Login realizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       503: { $ref: '#/components/responses/ServiceUnavailable' }
 */
router.post('/google', validate(googleLoginSchema), authController.google);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Dados do usuário logado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Usuário logado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/me', authenticate, authController.me);

export default router;
