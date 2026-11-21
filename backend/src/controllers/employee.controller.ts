/**
 * employee.controller.ts
 * Handlers HTTP do CRUD de funcionários (somente ADMIN).
 */
import { Request, Response } from 'express';
import * as employeeService from '../services/employee.service';

/** GET /funcionarios */
export async function list(_req: Request, res: Response) {
  res.json(await employeeService.listEmployees());
}

/** POST /funcionarios */
export async function create(req: Request, res: Response) {
  res.status(201).json(await employeeService.createEmployee(req.body));
}

/** PUT /funcionarios/:id */
export async function update(req: Request, res: Response) {
  res.json(await employeeService.updateEmployee(req.params.id as string, req.body));
}

/** DELETE /funcionarios/:id */
export async function remove(req: Request, res: Response) {
  await employeeService.deleteEmployee(req.params.id as string, req.user!.id);
  res.status(204).send();
}
