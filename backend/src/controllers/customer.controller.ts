/**
 * customer.controller.ts
 * Handlers HTTP de clientes/mensalistas e dos pagamentos de mensalidade (painel interno).
 */
import { Request, Response } from 'express';
import * as customerService from '../services/customer.service';
import * as membershipService from '../services/membership.service';
import { ListCustomersQuery } from '../schemas/customer.schema';

/** GET /clientes */
export async function list(req: Request, res: Response) {
  res.json(await customerService.listCustomers(req.query as unknown as ListCustomersQuery));
}

/** GET /clientes/:id */
export async function getById(req: Request, res: Response) {
  res.json(await customerService.getCustomerById(req.params.id as string));
}

/** POST /clientes */
export async function create(req: Request, res: Response) {
  res.status(201).json(await customerService.createCustomer(req.body));
}

/** PUT /clientes/:id */
export async function update(req: Request, res: Response) {
  res.json(await customerService.updateCustomer(req.params.id as string, req.body));
}

/** DELETE /clientes/:id */
export async function remove(req: Request, res: Response) {
  await customerService.deleteCustomer(req.params.id as string);
  res.status(204).send();
}

/** GET /clientes/:id/pagamentos */
export async function listPayments(req: Request, res: Response) {
  res.json(await membershipService.listPayments(req.params.id as string));
}

/** POST /clientes/:id/pagamentos */
export async function registerPayment(req: Request, res: Response) {
  res.status(201).json(await membershipService.registerPayment(req.params.id as string, req.user!.id, req.body));
}
