/**
 * membership.service.ts
 * Mensalidades: situação do mensalista (em dia / vencida) e registro de pagamentos.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { addMonths, dateOnlyToKey, keyToDateOnly, todayKey } from '../utils/date';
import { RegisterPaymentInput } from '../schemas/customer.schema';

export type MembershipStatus = 'EM_DIA' | 'VENCIDA' | 'NAO_MENSALISTA';

/**
 * Calcula a situação da mensalidade.
 * "Em dia" = dataVencimento é hoje ou depois (o cliente vale até o fim do dia do vencimento).
 * Mensalista sem dataVencimento ainda não pagou nada, então é tratado como vencido.
 * @param customer Precisa só de mensalista e dataVencimento.
 * @returns EM_DIA, VENCIDA ou NAO_MENSALISTA.
 */
export function getMembershipStatus(customer: { mensalista: boolean; dataVencimento: Date | null }): MembershipStatus {
  if (!customer.mensalista) return 'NAO_MENSALISTA';
  if (!customer.dataVencimento) return 'VENCIDA';
  // Comparar textos AAAA-MM-DD funciona porque a ordem alfabética = ordem cronológica.
  return dateOnlyToKey(customer.dataVencimento) >= todayKey() ? 'EM_DIA' : 'VENCIDA';
}

/**
 * Filtro do Prisma equivalente a getMembershipStatus, para filtrar direto no banco.
 * @param status Situação desejada.
 * @returns Cláusula where para a tabela Cliente.
 */
export function membershipStatusWhere(status: MembershipStatus): Prisma.ClienteWhereInput {
  const today = keyToDateOnly(todayKey());
  switch (status) {
    case 'NAO_MENSALISTA':
      return { mensalista: false };
    case 'EM_DIA':
      return { mensalista: true, dataVencimento: { gte: today } };
    case 'VENCIDA':
      return { mensalista: true, OR: [{ dataVencimento: null }, { dataVencimento: { lt: today } }] };
  }
}

/**
 * Registra o pagamento da mensalidade (regra 12).
 * Na MESMA transação: cria o PagamentoMensalidade e avança a dataVencimento em 1 mês.
 * Se uma das duas operações falhar, nenhuma é gravada.
 *
 * O vencimento avança a partir do vencimento atual (e não de hoje): quem está com
 * 2 meses de atraso e paga 1 mês continua devendo 1 mês. Se nunca pagou, parte de hoje.
 *
 * @param customerId Cliente mensalista.
 * @param operatorId Funcionário que recebeu o pagamento.
 * @param data referenciaMes (AAAA-MM) e valor opcional (padrão: valorMensal).
 * @throws 400 se não for mensalista; 409 se a referência já foi paga.
 */
export async function registerPayment(customerId: string, operatorId: string, data: RegisterPaymentInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await tx.cliente.findUnique({ where: { id: customerId } });
      if (!customer) throw new AppError('Cliente não encontrado.', 404);
      if (!customer.mensalista) throw new AppError('Este cliente não é mensalista.', 400);

      const valor = data.valor ?? customer.valorMensal;
      if (valor == null) throw new AppError('Informe o valor: este mensalista não tem valor mensal definido.', 400);

      const currentDue = customer.dataVencimento ? dateOnlyToKey(customer.dataVencimento) : todayKey();
      const newDue = addMonths(currentDue, 1);

      const payment = await tx.pagamentoMensalidade.create({
        data: { clienteId: customerId, operadorId: operatorId, valor, referenciaMes: data.referenciaMes },
      });
      await tx.cliente.update({ where: { id: customerId }, data: { dataVencimento: keyToDateOnly(newDue) } });

      return { ...payment, novoVencimento: newDue };
    });
  } catch (err) {
    // A restrição @@unique([clienteId, referenciaMes]) do banco impede pagamento duplicado.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(`Já existe um pagamento registrado para a referência ${data.referenciaMes}.`, 409);
    }
    throw err;
  }
}

/**
 * Histórico de pagamentos de um cliente, do mais recente ao mais antigo.
 * @throws 404 se o cliente não existir.
 */
export async function listPayments(customerId: string) {
  const exists = await prisma.cliente.count({ where: { id: customerId } });
  if (!exists) throw new AppError('Cliente não encontrado.', 404);

  return prisma.pagamentoMensalidade.findMany({
    where: { clienteId: customerId },
    include: { operador: { select: { id: true, nome: true } } },
    orderBy: { dataPagamento: 'desc' },
  });
}
