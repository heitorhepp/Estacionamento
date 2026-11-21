/**
 * customer.service.ts
 * CRUD de clientes/mensalistas usado pelo painel interno (ADMIN e OPERADOR).
 */
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { dateOnlyToKey, keyToDateOnly } from '../utils/date';
import { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from '../schemas/customer.schema';
import { hashPassword } from './auth.service';
import { getMembershipStatus, membershipStatusWhere } from './membership.service';

const userSelect = { id: true, nome: true, email: true, avatarUrl: true } satisfies Prisma.UsuarioSelect;

/**
 * Converte "AAAA-MM-DD" | null | undefined no formato do Prisma, mantendo
 * undefined (= não alterar) diferente de null (= apagar a data).
 */
function toDueDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value ? keyToDateOnly(value) : null;
}

/**
 * Prepara o cliente para a resposta: situação da mensalidade calculada e
 * dataVencimento como "AAAA-MM-DD" (evita o front converter de fuso e mostrar o dia anterior).
 */
function withMembershipInfo<T extends { mensalista: boolean; dataVencimento: Date | null }>(customer: T) {
  return {
    ...customer,
    dataVencimento: customer.dataVencimento ? dateOnlyToKey(customer.dataVencimento) : null,
    situacaoMensalidade: getMembershipStatus(customer),
  };
}

/**
 * Busca o perfil de cliente de um usuário logado (usado pelo portal e por veículos).
 * @throws 404 se o usuário não tiver perfil de cliente.
 */
export async function getCustomerByUserId(userId: string) {
  const customer = await prisma.cliente.findUnique({ where: { usuarioId: userId } });
  if (!customer) throw new AppError('Perfil de cliente não encontrado.', 404);
  return customer;
}

/**
 * Lista clientes com busca (nome, email ou CPF), filtro de mensalista/situação e paginação.
 * @returns { data, total, page, pageSize }
 */
export async function listCustomers(query: ListCustomersQuery) {
  const filters: Prisma.ClienteWhereInput[] = [];

  if (query.busca) {
    const digits = query.busca.replace(/\D/g, '');
    filters.push({
      OR: [
        { usuario: { nome: { contains: query.busca, mode: 'insensitive' } } },
        { usuario: { email: { contains: query.busca, mode: 'insensitive' } } },
        ...(digits ? [{ cpf: { contains: digits } }] : []),
      ],
    });
  }
  if (query.mensalista !== undefined) filters.push({ mensalista: query.mensalista });
  if (query.situacao) filters.push(membershipStatusWhere(query.situacao));

  const where: Prisma.ClienteWhereInput = { AND: filters };

  const [customers, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { usuario: { select: userSelect }, _count: { select: { veiculos: true } } },
      orderBy: { usuario: { nome: 'asc' } },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.cliente.count({ where }),
  ]);

  return {
    data: customers.map(withMembershipInfo),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * Detalhe do cliente com veículos e histórico de pagamentos.
 * @throws 404 se não existir.
 */
export async function getCustomerById(id: string) {
  const customer = await prisma.cliente.findUnique({
    where: { id },
    include: {
      usuario: { select: userSelect },
      veiculos: { orderBy: { placa: 'asc' } },
      pagamentos: { include: { operador: { select: { id: true, nome: true } } }, orderBy: { dataPagamento: 'desc' } },
    },
  });
  if (!customer) throw new AppError('Cliente não encontrado.', 404);
  return withMembershipInfo(customer);
}

/**
 * Cria cliente pelo painel: Usuario (CLIENTE) + Cliente num único nested create (atômico).
 * @throws 409 se email ou CPF já existirem.
 */
export async function createCustomer(data: CreateCustomerInput) {
  const user = await prisma.usuario.create({
    data: {
      nome: data.nome,
      email: data.email,
      senha: data.senha ? await hashPassword(data.senha) : null,
      role: Role.CLIENTE,
      cliente: {
        create: {
          cpf: data.cpf,
          telefone: data.telefone,
          mensalista: data.mensalista,
          valorMensal: data.mensalista ? data.valorMensal : null,
          dataVencimento: data.mensalista ? toDueDate(data.dataVencimento) : null,
        },
      },
    },
    include: { cliente: true },
  });
  return getCustomerById(user.cliente!.id);
}

/**
 * Atualiza dados do cliente (e nome/email do usuário vinculado).
 * @throws 400 se ficar mensalista sem valor mensal.
 */
export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  const current = await prisma.cliente.findUnique({ where: { id } });
  if (!current) throw new AppError('Cliente não encontrado.', 404);

  // A regra "mensalista precisa de valor" é checada com o estado final (atual + alterações).
  const willBeMember = data.mensalista ?? current.mensalista;
  const finalValue = data.valorMensal !== undefined ? data.valorMensal : current.valorMensal;
  if (willBeMember && finalValue == null) throw new AppError('Informe o valor da mensalidade.', 400);

  await prisma.cliente.update({
    where: { id },
    data: {
      cpf: data.cpf,
      telefone: data.telefone,
      mensalista: data.mensalista,
      valorMensal: data.valorMensal,
      dataVencimento: toDueDate(data.dataVencimento),
      usuario: { update: { nome: data.nome, email: data.email } },
    },
  });
  return getCustomerById(id);
}

/**
 * Exclui o cliente (apagando o Usuario, o Cliente e os veículos vão junto em cascata).
 * As estadias continuam no histórico, só perdem o vínculo com o veículo.
 * @throws 409 se houver pagamentos de mensalidade (são receita já registrada).
 */
export async function deleteCustomer(id: string) {
  const customer = await prisma.cliente.findUnique({ where: { id }, include: { _count: { select: { pagamentos: true } } } });
  if (!customer) throw new AppError('Cliente não encontrado.', 404);
  if (customer._count.pagamentos > 0) {
    throw new AppError('Este cliente tem pagamentos de mensalidade registrados e não pode ser excluído.', 409);
  }
  await prisma.usuario.delete({ where: { id: customer.usuarioId } });
}
