/**
 * index.ts (routes)
 * Junta as rotas de todos os recursos sob o prefixo /api (montado em app.ts).
 */
import { Router } from 'express';
import aiRoutes from './ai.routes';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import dashboardRoutes from './dashboard.routes';
import employeeRoutes from './employee.routes';
import movementRoutes from './movement.routes';
import portalRoutes from './portal.routes';
import priceRoutes from './price.routes';
import spotRoutes from './spot.routes';
import vehicleRoutes from './vehicle.routes';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Auth]
 *     summary: Health check (usado pelo Render para saber se a API está no ar)
 *     responses:
 *       200:
 *         description: API no ar
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { status: { type: string, example: ok } } }
 */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/funcionarios', employeeRoutes);
router.use('/clientes', customerRoutes);
router.use('/veiculos', vehicleRoutes);
router.use('/vagas', spotRoutes);
router.use('/precos', priceRoutes);
router.use('/movimentacoes', movementRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/portal', portalRoutes);
router.use('/ai', aiRoutes);

export default router;
