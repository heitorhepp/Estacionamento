/**
 * dashboard.controller.ts
 * Handler HTTP do dashboard do ADMIN.
 */
import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { DashboardQuery } from '../schemas/dashboard.schema';

/** GET /dashboard?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD */
export async function get(req: Request, res: Response) {
  res.json(await dashboardService.getDashboard(req.query as unknown as DashboardQuery));
}
