/**
 * portal.service.ts
 * Operações do portal do cliente. Tudo é filtrado pelo usuário logado:
 * o cliente só enxerga os próprios dados (regra 13). Nenhuma função recebe
 * um "clienteId" vindo do front — ele sempre é descoberto a partir do token.
 */
import { StatusMovimentacao } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { dateOnlyToKey, diffInMinutes } from '../utils/date';
import { ChangePasswordInput, ListStaysQuery, UpdateProfileInput } from '../schemas/portal.schema';
import { checkPassword, hashPassword, toPublicUser } from './auth.service';
import { getMembershipStatus } from './membership.service';

/**
 * Perfil do cliente logado (dados de login + dados de cliente).
 * @throws 404 se o usuário não for cliente.
 */
export async function getProfile(userId: string) {
  const user = await prisma.usuario.findUnique({ where: { id: userId }, include: { cliente: true } });
  if (!user?.cliente) throw new AppError('Perfil de cliente não encontrado.', 404);

  const { cpf, telefone, mensalista } = user.cliente;
  return { ...toPublicUser(user), cpf, telefone, mensalista };
}

/** Atualiza nome, telefone e CPF do cliente logado. */
export async function updateProfile(userId: string, data: UpdateProfileInput) {
  await prisma.usuario.update({
    where: { id: userId },
    data: { nome: data.nome, cliente: { update: { telefone: data.telefone, cpf: data.cpf } } },
  });
  return getProfile(userId);
}

/**
 * Define ou altera a senha (regra 15).
 * - Quem já tem senha precisa informar a atual.
 * - Quem entrou só pelo Google define a primeira senha sem a atual.
 * @throws 400 se a senha atual estiver ausente ou incorreta.
 */
export async function changePassword(userId: string, data: ChangePasswordInput) {
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Usuário não encontrado.', 404);

  if (user.senha) {
    if (!data.senhaAtual) throw new AppError('Informe a senha atual.', 400);
    if (!(await checkPassword(data.senhaAtual, user.senha))) throw new AppError('A senha atual está incorreta.', 400);
  }

  await prisma.usuario.update({ where: { id: userId }, data: { senha: await hashPassword(data.novaSenha) } });
}

/**
 * Histórico de estadias dos veículos do cliente, com tempo e valor pago.
 * Canceladas não aparecem (foram lançamentos por engano).
 * Estadias em andamento mostram o tempo decorrido até agora.
 */
export async function listStays(userId: string, query: ListStaysQuery) {
  const where = {
    veiculo: { cliente: { usuarioId: userId } },
    status: { not: StatusMovimentacao.CANCELADA },
  };

  const [stays, total] = await Promise.all([
    prisma.movimentacao.findMany({
      where,
      select: {
        id: true,
        placa: true,
        modelo: true,
        tipoVeiculo: true,
        dataHoraEntrada: true,
        dataHoraSaida: true,
        valorCobrado: true,
        formaPagamento: true,
        status: true,
        vaga: { select: { codigo: true, setor: true } },
      },
      orderBy: { dataHoraEntrada: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.movimentacao.count({ where }),
  ]);

  const now = new Date();
  return {
    data: stays.map((s) => ({ ...s, minutosPermanencia: diffInMinutes(s.dataHoraEntrada, s.dataHoraSaida ?? now) })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * Situação da mensalidade do cliente: em dia / vencida / não é mensalista,
 * próximo vencimento e histórico de pagamentos.
 */
export async function getMembership(userId: string) {
  const customer = await prisma.cliente.findUnique({
    where: { usuarioId: userId },
    include: {
      pagamentos: {
        select: { id: true, valor: true, dataPagamento: true, referenciaMes: true },
        orderBy: { dataPagamento: 'desc' },
      },
    },
  });
  if (!customer) throw new AppError('Perfil de cliente não encontrado.', 404);

  return {
    situacao: getMembershipStatus(customer),
    valorMensal: customer.valorMensal,
    dataVencimento: customer.dataVencimento ? dateOnlyToKey(customer.dataVencimento) : null,
    pagamentos: customer.pagamentos,
  };
}
