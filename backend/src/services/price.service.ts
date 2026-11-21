/**
 * price.service.ts
 * Tabela de preços vigente (uma linha por tipo de veículo).
 * Alterar a tabela NÃO afeta veículos já no pátio: eles usam a cópia congelada
 * na entrada (regra 5, ver movement.service).
 */
import { TipoVeiculo } from '@prisma/client';
import { prisma } from '../config/prisma';
import { UpsertPriceInput } from '../schemas/price.schema';

/** @returns As tabelas de preço cadastradas. */
export function listPrices() {
  return prisma.tabelaPreco.findMany({ orderBy: { tipoVeiculo: 'asc' } });
}

/**
 * Cria ou atualiza a tabela de um tipo de veículo (upsert).
 * @param tipoVeiculo CARRO ou MOTO.
 * @param data Valores da tabela.
 */
export function upsertPrice(tipoVeiculo: TipoVeiculo, data: UpsertPriceInput) {
  return prisma.tabelaPreco.upsert({
    where: { tipoVeiculo },
    create: { tipoVeiculo, ...data },
    update: data,
  });
}
