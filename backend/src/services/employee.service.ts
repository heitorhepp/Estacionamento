/**
 * employee.service.ts
 * CRUD de funcionários (ADMIN e OPERADOR). Só o ADMIN acessa estas operações,
 * e é a ÚNICA forma de criar uma conta de funcionário (regra 16).
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { STAFF_ROLES } from '../middlewares/roles';
import { AppError } from '../utils/AppError';
import { CreateEmployeeInput, UpdateEmployeeInput } from '../schemas/employee.schema';
import { hashPassword } from './auth.service';

/** Campos devolvidos (nunca a senha). */
const employeeSelect = {
  id: true,
  nome: true,
  email: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
} satisfies Prisma.UsuarioSelect;

/**
 * Busca um funcionário pelo id.
 * @throws 404 se não existir ou se for um cliente.
 */
async function findEmployeeOrFail(id: string) {
  const employee = await prisma.usuario.findFirst({ where: { id, role: { in: STAFF_ROLES } }, select: employeeSelect });
  if (!employee) throw new AppError('Funcionário não encontrado.', 404);
  return employee;
}

/** @returns Todos os funcionários, em ordem alfabética. */
export function listEmployees() {
  return prisma.usuario.findMany({
    where: { role: { in: STAFF_ROLES } },
    select: employeeSelect,
    orderBy: { nome: 'asc' },
  });
}

/**
 * Cria um funcionário com senha (funcionário não pode usar login Google).
 * @throws 409 se o email já existir (tratado no errorHandler).
 */
export async function createEmployee(data: CreateEmployeeInput) {
  return prisma.usuario.create({
    data: { ...data, senha: await hashPassword(data.senha) },
    select: employeeSelect,
  });
}

/**
 * Atualiza um funcionário. A senha só é trocada se for enviada.
 */
export async function updateEmployee(id: string, data: UpdateEmployeeInput) {
  await findEmployeeOrFail(id);
  return prisma.usuario.update({
    where: { id },
    data: { ...data, senha: data.senha ? await hashPassword(data.senha) : undefined },
    select: employeeSelect,
  });
}

/**
 * Exclui um funcionário.
 * @param id Funcionário a excluir.
 * @param currentUserId Quem está pedindo (não pode excluir a si mesmo).
 * @throws 409 se ele tiver movimentações/pagamentos registrados (histórico é preservado).
 */
export async function deleteEmployee(id: string, currentUserId: string) {
  if (id === currentUserId) throw new AppError('Você não pode excluir a própria conta.', 400);
  await findEmployeeOrFail(id);

  try {
    await prisma.usuario.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new AppError('Este funcionário tem movimentações ou pagamentos registrados e não pode ser excluído.', 409);
    }
    throw err;
  }
}
