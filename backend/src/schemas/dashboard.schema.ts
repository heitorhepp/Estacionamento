/**
 * dashboard.schema.ts
 * Filtro de período do dashboard (padrão: últimos 30 dias).
 */
import { z } from 'zod';
import { dateKeySchema } from './common.schema';

export const dashboardQuerySchema = z.object({
  dataInicio: dateKeySchema.optional(),
  dataFim: dateKeySchema.optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
