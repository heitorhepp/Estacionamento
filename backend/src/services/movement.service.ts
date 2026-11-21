/**
 * movement.service.ts
 * Coração do sistema: entrada, edição, pré-visualização e confirmação de saída,
 * cancelamento e histórico de movimentações (regras 1, 2, 4–10).
 */
import { FormaPagamento, Prisma, StatusMovimentacao } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { diffInMinutes, endOfDay, startOfDay } from '../utils/date';
import { calculateFee, fromCents, toCents } from '../utils/tariff';
import {
  ConfirmExitInput,
  ListMovementsQuery,
  RegisterEntryInput,
  UpdateMovementInput,
} from '../schemas/movement.schema';
import { analyzeVehiclePhoto } from './ai.service';
import { getMembershipStatus } from './membership.service';
import { UPLOAD_FOLDERS, uploadImage } from './upload.service';

const { ABERTA, FINALIZADA, CANCELADA } = StatusMovimentacao;

/**
 * Isolamento Serializable: se duas entradas simultâneas tentarem ocupar a mesma vaga
 * (ou a mesma placa), o PostgreSQL detecta o conflito e aborta uma delas (erro P2034,
 * respondido como 409). Sem isso, as duas poderiam ler "vaga livre" ao mesmo tempo.
 */
const SERIALIZABLE = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

/** Relações incluídas no detalhe de uma movimentação. */
const detailInclude = {
  vaga: { select: { id: true, codigo: true, setor: true, tipo: true } },
  veiculo: {
    select: { id: true, placa: true, cliente: { select: { id: true, mensalista: true, usuario: { select: { nome: true } } } } },
  },
  operadorEntrada: { select: { id: true, nome: true } },
  operadorSaida: { select: { id: true, nome: true } },
} satisfies Prisma.MovimentacaoInclude;

/**
 * Garante que a placa não tem outra movimentação ABERTA (regra 1).
 * @param tx Transação em andamento.
 * @param placa Placa normalizada.
 * @param ignoreId Movimentação a ignorar (usado na edição).
 * @throws 409 se já houver entrada em aberto.
 */
async function ensurePlateHasNoOpenMovement(tx: Prisma.TransactionClient, placa: string, ignoreId?: string) {
  const open = await tx.movimentacao.findFirst({
    where: { placa, status: ABERTA, id: ignoreId ? { not: ignoreId } : undefined },
    include: { vaga: { select: { codigo: true } } },
  });
  if (open) throw new AppError(`A placa ${placa} já está no pátio (vaga ${open.vaga.codigo}).`, 409);
}

/**
 * Primeiro passo da tela de entrada: recebe a foto, salva no Cloudinary e pede ao Gemini
 * as sugestões de preenchimento — as duas coisas em paralelo, para responder mais rápido.
 *
 * Nenhuma das duas falhas impede a entrada: se a IA falhar, o operador preenche à mão;
 * se o upload falhar, a entrada pode ser registrada sem foto. Os problemas voltam em "avisos".
 *
 * @param file Foto recebida pelo Multer.
 * @returns { fotoUrl, sugestao, avisos } — nada é gravado no banco aqui.
 */
export async function analyzeEntryPhoto(file: Express.Multer.File | undefined) {
  if (!file) throw new AppError('Envie uma imagem no campo "foto".', 400);

  const [upload, suggestion] = await Promise.allSettled([
    uploadImage(file, UPLOAD_FOLDERS.entries),
    analyzeVehiclePhoto(file),
  ]);

  const warnings = [upload, suggestion]
    .filter((result) => result.status === 'rejected')
    .map((result) => (result.reason instanceof AppError ? result.reason.message : 'Erro inesperado.'));

  return {
    fotoUrl: upload.status === 'fulfilled' ? upload.value : null,
    sugestao: suggestion.status === 'fulfilled' ? suggestion.value : null,
    avisos: warnings,
  };
}

/**
 * Registra a entrada de um veículo.
 *
 * Dentro de uma única transação:
 * 1. Busca a tabela de preço do tipo de veículo.
 * 2. Valida a vaga: existe, está ativa, é do tipo certo e está livre (regra 2).
 * 3. Valida que a placa não está no pátio (regra 1).
 * 4. Se a placa for de um Veiculo cadastrado, vincula (regra 6).
 * 5. Cria a movimentação COPIANDO os preços vigentes (regra 5 — preço congelado).
 *
 * @param operatorId Funcionário que registrou a entrada.
 * @param data Dados já validados pelo Zod (placa normalizada).
 */
export async function registerEntry(operatorId: string, data: RegisterEntryInput) {
  return prisma.$transaction(async (tx) => {
    const price = await tx.tabelaPreco.findUnique({ where: { tipoVeiculo: data.tipoVeiculo } });
    if (!price) throw new AppError(`Não há tabela de preços para ${data.tipoVeiculo}. Peça ao administrador para cadastrá-la.`, 400);

    const spot = await tx.vaga.findUnique({ where: { id: data.vagaId } });
    if (!spot) throw new AppError('Vaga não encontrada.', 404);
    if (!spot.ativa) throw new AppError(`A vaga ${spot.codigo} está inativa.`, 409);
    if (spot.tipo !== data.tipoVeiculo) {
      throw new AppError(`A vaga ${spot.codigo} é para ${spot.tipo}, mas o veículo é ${data.tipoVeiculo}.`, 400);
    }

    const spotBusy = await tx.movimentacao.findFirst({ where: { vagaId: spot.id, status: ABERTA }, select: { placa: true } });
    if (spotBusy) throw new AppError(`A vaga ${spot.codigo} já está ocupada pelo veículo ${spotBusy.placa}.`, 409);

    await ensurePlateHasNoOpenMovement(tx, data.placa);

    const registeredVehicle = await tx.veiculo.findUnique({ where: { placa: data.placa }, select: { id: true } });

    return tx.movimentacao.create({
      data: {
        placa: data.placa,
        tipoVeiculo: data.tipoVeiculo,
        modelo: data.modelo,
        cor: data.cor,
        avariasObservadas: data.avariasObservadas,
        fotoEntradaUrl: data.fotoEntradaUrl,
        vagaId: spot.id,
        veiculoId: registeredVehicle?.id ?? null,
        operadorEntradaId: operatorId,
        // Cópia da tabela vigente: mudanças futuras na tabela não afetam esta estadia.
        precoToleranciaMinutos: price.toleranciaMinutos,
        precoPrimeiraHora: price.valorPrimeiraHora,
        precoHoraAdicional: price.valorHoraAdicional,
        precoDiaria: price.valorDiaria,
      },
      include: detailInclude,
    });
  }, SERIALIZABLE);
}

/**
 * Edita dados descritivos de uma movimentação ABERTA (placa, modelo, cor, avarias).
 * Se a placa mudar, revalida a regra 1 e refaz o vínculo com o Veiculo cadastrado.
 * @throws 409 se a movimentação já foi finalizada ou cancelada (regra 10).
 */
export async function updateMovement(id: string, data: UpdateMovementInput) {
  return prisma.$transaction(async (tx) => {
    const movement = await tx.movimentacao.findUnique({ where: { id } });
    if (!movement) throw new AppError('Movimentação não encontrada.', 404);
    if (movement.status !== ABERTA) {
      throw new AppError('Movimentações finalizadas ou canceladas não podem ser editadas.', 409);
    }

    let veiculoId: string | null | undefined;
    if (data.placa && data.placa !== movement.placa) {
      await ensurePlateHasNoOpenMovement(tx, data.placa, id);
      const vehicle = await tx.veiculo.findUnique({ where: { placa: data.placa }, select: { id: true } });
      veiculoId = vehicle?.id ?? null;
    }

    return tx.movimentacao.update({ where: { id }, data: { ...data, veiculoId }, include: detailInclude });
  }, SERIALIZABLE);
}

/**
 * Verifica se a estadia é coberta pela mensalidade (regras 6 e 7).
 *
 * É coberta quando:
 * - a placa pertence a um veículo de um cliente mensalista;
 * - a mensalidade está em dia (mensalista vencido paga como avulso);
 * - nenhum OUTRO veículo do mesmo cliente já estava usando a mensalidade quando este
 *   entrou. "Usando" = outra estadia que entrou antes e ainda está ABERTA, ou que saiu
 *   como MENSALISTA depois que esta entrou. A mensalidade cobre um veículo por vez.
 *
 * @returns { covered, reason } — reason é exibida ao operador na pré-visualização.
 */
async function checkMembershipCoverage(movement: {
  id: string;
  dataHoraEntrada: Date;
  veiculo: { cliente: { id: string; mensalista: boolean; dataVencimento: Date | null } } | null;
}): Promise<{ covered: boolean; reason: string | null }> {
  const customer = movement.veiculo?.cliente;
  if (!customer?.mensalista) return { covered: false, reason: null };

  if (getMembershipStatus(customer) !== 'EM_DIA') {
    return { covered: false, reason: 'Mensalidade vencida: a estadia será cobrada como avulsa.' };
  }

  const otherCovered = await prisma.movimentacao.findFirst({
    where: {
      id: { not: movement.id },
      veiculo: { clienteId: customer.id },
      dataHoraEntrada: { lt: movement.dataHoraEntrada },
      OR: [
        { status: ABERTA },
        { status: FINALIZADA, formaPagamento: FormaPagamento.MENSALISTA, dataHoraSaida: { gt: movement.dataHoraEntrada } },
      ],
    },
    select: { placa: true },
  });
  if (otherCovered) {
    return {
      covered: false,
      reason: `A mensalidade já estava cobrindo o veículo ${otherCovered.placa}: esta estadia será cobrada como avulsa.`,
    };
  }

  return { covered: true, reason: 'Mensalista em dia: saída sem custo.' };
}

/**
 * Calcula a saída de uma movimentação ABERTA sem gravar nada.
 * Usa SEMPRE os preços congelados na entrada e o horário do servidor (regra 4).
 * @param id Movimentação.
 * @param exitTime Horário da saída (padrão: agora).
 */
async function buildExitQuote(id: string, exitTime = new Date()) {
  const movement = await prisma.movimentacao.findUnique({
    where: { id },
    include: { vaga: { select: { codigo: true } }, veiculo: { include: { cliente: true } } },
  });
  if (!movement) throw new AppError('Movimentação não encontrada.', 404);
  if (movement.status !== ABERTA) throw new AppError('Esta movimentação não está mais aberta.', 409);

  const minutes = diffInMinutes(movement.dataHoraEntrada, exitTime);
  const coverage = await checkMembershipCoverage(movement);

  const valueCents = coverage.covered
    ? 0
    : calculateFee(minutes, {
        toleranceMinutes: movement.precoToleranciaMinutos,
        firstHourCents: toCents(movement.precoPrimeiraHora),
        additionalHourCents: toCents(movement.precoHoraAdicional),
        dailyCents: toCents(movement.precoDiaria),
      });

  return { movement, exitTime, minutes, coverage, valueCents };
}

/**
 * Passo 1 da saída (regra 8): pré-visualização do valor, sem alterar nada.
 */
export async function previewExit(id: string) {
  const { movement, exitTime, minutes, coverage, valueCents } = await buildExitQuote(id);
  return {
    movimentacaoId: movement.id,
    placa: movement.placa,
    vaga: movement.vaga.codigo,
    dataHoraEntrada: movement.dataHoraEntrada,
    dataHoraSaida: exitTime,
    minutosPermanencia: minutes,
    valorCobrado: fromCents(valueCents),
    cobertoPorMensalidade: coverage.covered,
    observacao: coverage.reason,
    precos: {
      toleranciaMinutos: movement.precoToleranciaMinutos,
      primeiraHora: movement.precoPrimeiraHora,
      horaAdicional: movement.precoHoraAdicional,
      diaria: movement.precoDiaria,
    },
  };
}

/**
 * Passo 2 da saída (regra 8): recalcula o valor (o front NUNCA envia valor),
 * grava valor e forma de pagamento e libera a vaga (status FINALIZADA).
 *
 * @param id Movimentação.
 * @param operatorId Funcionário que registrou a saída.
 * @param data Forma de pagamento (exigida só se houver valor a pagar).
 * @throws 400 se faltar forma de pagamento; 409 se já tiver sido finalizada.
 */
export async function confirmExit(id: string, operatorId: string, data: ConfirmExitInput) {
  const { exitTime, coverage, valueCents } = await buildExitQuote(id);

  let formaPagamento: FormaPagamento | null;
  if (coverage.covered) {
    formaPagamento = FormaPagamento.MENSALISTA;
  } else if (valueCents === 0) {
    formaPagamento = null; // Dentro da tolerância: nada a pagar.
  } else {
    if (!data.formaPagamento) throw new AppError('Informe a forma de pagamento.', 400);
    if (data.formaPagamento === FormaPagamento.MENSALISTA) {
      throw new AppError('Esta estadia não é coberta pela mensalidade. Escolha PIX, dinheiro ou cartão.', 400);
    }
    formaPagamento = data.formaPagamento;
  }

  // "where status ABERTA" protege contra dois cliques/operadores finalizando ao mesmo tempo.
  const result = await prisma.movimentacao.updateMany({
    where: { id, status: ABERTA },
    data: {
      status: FINALIZADA,
      dataHoraSaida: exitTime,
      valorCobrado: fromCents(valueCents),
      formaPagamento,
      operadorSaidaId: operatorId,
    },
  });
  if (result.count === 0) throw new AppError('Esta movimentação já foi finalizada ou cancelada.', 409);

  return getMovementById(id);
}

/**
 * Cancela uma entrada lançada por engano (regra 9): status CANCELADA, motivo obrigatório,
 * vaga liberada. Canceladas não entram no faturamento nem no dashboard.
 * dataHoraSaida e operadorSaidaId registram quando e quem cancelou.
 * @throws 409 se a movimentação não estiver ABERTA.
 */
export async function cancelMovement(id: string, operatorId: string, motivo: string) {
  const result = await prisma.movimentacao.updateMany({
    where: { id, status: ABERTA },
    data: { status: CANCELADA, motivoCancelamento: motivo, dataHoraSaida: new Date(), operadorSaidaId: operatorId },
  });

  if (result.count === 0) {
    const exists = await prisma.movimentacao.count({ where: { id } });
    if (!exists) throw new AppError('Movimentação não encontrada.', 404);
    throw new AppError('Só é possível cancelar movimentações em aberto.', 409);
  }
  return getMovementById(id);
}

/**
 * Detalhe de uma movimentação.
 * @throws 404 se não existir.
 */
export async function getMovementById(id: string) {
  const movement = await prisma.movimentacao.findUnique({ where: { id }, include: detailInclude });
  if (!movement) throw new AppError('Movimentação não encontrada.', 404);
  return movement;
}

/**
 * Histórico com filtros por placa (parcial), status e período (data de entrada, fuso SP).
 * @returns { data, total, page, pageSize }
 */
export async function listMovements(query: ListMovementsQuery) {
  const where: Prisma.MovimentacaoWhereInput = {
    placa: query.placa ? { contains: query.placa } : undefined,
    status: query.status,
    dataHoraEntrada: {
      gte: query.dataInicio ? startOfDay(query.dataInicio) : undefined,
      lte: query.dataFim ? endOfDay(query.dataFim) : undefined,
    },
  };

  const [data, total] = await Promise.all([
    prisma.movimentacao.findMany({
      where,
      include: detailInclude,
      orderBy: { dataHoraEntrada: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.movimentacao.count({ where }),
  ]);

  return { data, total, page: query.page, pageSize: query.pageSize };
}
