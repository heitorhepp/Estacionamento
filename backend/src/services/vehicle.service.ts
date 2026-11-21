/**
 * vehicle.service.ts
 * Veículos cadastrados. O CLIENTE gerencia só os próprios (regra 13);
 * ADMIN/OPERADOR gerenciam os de qualquer cliente.
 */
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { CreateVehicleInput, ListVehiclesQuery, UpdateVehicleInput } from '../schemas/vehicle.schema';
import { getCustomerByUserId } from './customer.service';
import { UPLOAD_FOLDERS, uploadImage } from './upload.service';

/** Usuário logado (vem de req.user). */
type AuthUser = { id: string; role: Role };

/**
 * Busca o veículo garantindo que o usuário pode mexer nele.
 * Para um CLIENTE, veículo de outra pessoa responde 404 (e não 403) para não
 * revelar que a placa existe no sistema.
 */
async function findVehicleOrFail(user: AuthUser, id: string) {
  const vehicle = await prisma.veiculo.findUnique({ where: { id } });
  if (!vehicle) throw new AppError('Veículo não encontrado.', 404);

  if (user.role === Role.CLIENTE) {
    const customer = await getCustomerByUserId(user.id);
    if (vehicle.clienteId !== customer.id) throw new AppError('Veículo não encontrado.', 404);
  }
  return vehicle;
}

/**
 * Lista veículos: os próprios (CLIENTE) ou todos/filtrados por cliente (equipe).
 */
export async function listVehicles(user: AuthUser, query: ListVehiclesQuery) {
  const clienteId = user.role === Role.CLIENTE ? (await getCustomerByUserId(user.id)).id : query.clienteId;

  return prisma.veiculo.findMany({
    where: { clienteId },
    include: { cliente: { select: { id: true, usuario: { select: { nome: true } } } } },
    orderBy: { placa: 'asc' },
  });
}

/**
 * Cadastra um veículo.
 * @throws 400 se a equipe não informar o cliente; 409 se a placa já existir.
 */
export async function createVehicle(user: AuthUser, data: CreateVehicleInput) {
  let clienteId: string;
  if (user.role === Role.CLIENTE) {
    clienteId = (await getCustomerByUserId(user.id)).id;
  } else {
    if (!data.clienteId) throw new AppError('Informe o cliente dono do veículo.', 400);
    const exists = await prisma.cliente.count({ where: { id: data.clienteId } });
    if (!exists) throw new AppError('Cliente não encontrado.', 404);
    clienteId = data.clienteId;
  }

  const { clienteId: _ignored, ...vehicleData } = data;
  return prisma.veiculo.create({ data: { ...vehicleData, clienteId } });
}

/** Atualiza um veículo (somente o dono ou a equipe). */
export async function updateVehicle(user: AuthUser, id: string, data: UpdateVehicleInput) {
  await findVehicleOrFail(user, id);
  return prisma.veiculo.update({ where: { id }, data });
}

/**
 * Envia a foto do veículo ao Cloudinary (pasta estacionamento/veiculos) e salva a URL.
 * @param file Imagem recebida pelo Multer.
 */
export async function setVehiclePhoto(user: AuthUser, id: string, file: Express.Multer.File | undefined) {
  await findVehicleOrFail(user, id);
  const fotoUrl = await uploadImage(file, UPLOAD_FOLDERS.vehicles);
  return prisma.veiculo.update({ where: { id }, data: { fotoUrl } });
}

/** Exclui um veículo. As estadias antigas ficam no histórico, sem o vínculo. */
export async function deleteVehicle(user: AuthUser, id: string) {
  await findVehicleOrFail(user, id);
  await prisma.veiculo.delete({ where: { id } });
}
