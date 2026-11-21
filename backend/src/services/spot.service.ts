/**
 * spot.service.ts
 * Vagas: mapa com status (livre/ocupada/inativa), contagem pública de vagas livres
 * e CRUD (só ADMIN).
 *
 * A vaga NÃO tem um campo "ocupada": ela está ocupada quando existe uma Movimentacao
 * ABERTA apontando para ela. Assim não há como os dois ficarem fora de sincronia.
 */
import { StatusMovimentacao, TipoVeiculo } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { CreateSpotInput, ListSpotsQuery, UpdateSpotInput } from '../schemas/spot.schema';

const { ABERTA } = StatusMovimentacao;

/** Conta movimentações ABERTAS na vaga (0 ou 1). */
function countOpenMovements(spotId: string) {
  return prisma.movimentacao.count({ where: { vagaId: spotId, status: ABERTA } });
}

/**
 * Mapa de vagas: cada vaga com seu status e, se ocupada, os dados da estadia atual.
 */
export async function listSpots(query: ListSpotsQuery) {
  const spots = await prisma.vaga.findMany({
    where: { setor: query.setor, tipo: query.tipo },
    include: {
      movimentacoes: {
        where: { status: ABERTA },
        select: { id: true, placa: true, modelo: true, cor: true, tipoVeiculo: true, fotoEntradaUrl: true, dataHoraEntrada: true },
      },
    },
    orderBy: [{ setor: 'asc' }, { codigo: 'asc' }],
  });

  return spots.map(({ movimentacoes, ...spot }) => {
    const current = movimentacoes[0] ?? null;
    return {
      ...spot,
      status: !spot.ativa ? 'INATIVA' : current ? 'OCUPADA' : 'LIVRE',
      movimentacaoAtual: current,
    };
  });
}

/**
 * Resumo de ocupação por tipo de veículo — usado na consulta pública (regra 17)
 * e nos cards do dashboard. Considera só vagas ativas.
 * @returns [{ tipo, total, ocupadas, livres, percentualOcupacao }]
 */
export async function getOccupancySummary() {
  return Promise.all(
    Object.values(TipoVeiculo).map(async (tipo) => {
      const [total, ocupadas] = await Promise.all([
        prisma.vaga.count({ where: { tipo, ativa: true } }),
        prisma.vaga.count({ where: { tipo, ativa: true, movimentacoes: { some: { status: ABERTA } } } }),
      ]);
      return {
        tipo,
        total,
        ocupadas,
        livres: total - ocupadas,
        percentualOcupacao: total ? Math.round((ocupadas / total) * 100) : 0,
      };
    }),
  );
}

/** Cria uma vaga. @throws 409 se o código já existir. */
export function createSpot(data: CreateSpotInput) {
  return prisma.vaga.create({ data });
}

/**
 * Atualiza uma vaga.
 * @throws 409 ao desativar ou trocar o tipo de uma vaga ocupada (regra 11).
 */
export async function updateSpot(id: string, data: UpdateSpotInput) {
  const spot = await prisma.vaga.findUnique({ where: { id } });
  if (!spot) throw new AppError('Vaga não encontrada.', 404);

  const deactivating = data.ativa === false && spot.ativa;
  const changingType = data.tipo !== undefined && data.tipo !== spot.tipo;
  if ((deactivating || changingType) && (await countOpenMovements(id)) > 0) {
    throw new AppError('A vaga está ocupada. Registre a saída do veículo antes de desativá-la ou mudar o tipo.', 409);
  }

  return prisma.vaga.update({ where: { id }, data });
}

/**
 * Exclui uma vaga.
 * @throws 409 se estiver ocupada (regra 11) ou se tiver histórico — nesse caso o
 * certo é desativar, para não perder o histórico de movimentações.
 */
export async function deleteSpot(id: string) {
  const spot = await prisma.vaga.findUnique({ where: { id }, include: { _count: { select: { movimentacoes: true } } } });
  if (!spot) throw new AppError('Vaga não encontrada.', 404);

  if ((await countOpenMovements(id)) > 0) {
    throw new AppError('A vaga está ocupada e não pode ser excluída.', 409);
  }
  if (spot._count.movimentacoes > 0) {
    throw new AppError('Esta vaga tem histórico de movimentações. Desative-a em vez de excluir.', 409);
  }
  await prisma.vaga.delete({ where: { id } });
}
