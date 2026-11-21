/**
 * seed.ts
 * Popula o banco com dados de demonstração para a apresentação:
 * - 1 admin, 2 operadores;
 * - 6 clientes (3 mensalistas com histórico de pagamentos, 1 deles vencido;
 *   1 conta simulando login pelo Google, sem senha) com veículos;
 * - 30 vagas de carro e 10 de moto em 2 setores, tabela de preços;
 * - veículos no pátio agora e movimentações dos últimos 30 dias (algumas canceladas).
 *
 * ATENÇÃO: APAGA todos os dados antes de inserir. Rode com: npm run seed
 *
 * Os valores cobrados usam a MESMA função de tarifa do back-end (src/utils/tariff),
 * e os números aleatórios usam uma semente fixa: o resultado é sempre igual.
 */
import { FormaPagamento, Prisma, PrismaClient, Role, StatusMovimentacao, TipoVeiculo } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { addDays, addMonths, keyToDateOnly, startOfDay, todayKey } from '../src/utils/date';
import { normalizePlate } from '../src/utils/plate';
import { calculateFee, fromCents, toCents } from '../src/utils/tariff';

// Lê o backend/.env; variáveis já definidas no terminal têm prioridade (útil para semear o Neon).
dotenv.config({ quiet: true });

const prisma = new PrismaClient();

// -----------------------------------------------------------------------------
// Aleatoriedade com semente fixa (mulberry32): mesmos dados em toda execução.
// -----------------------------------------------------------------------------
let seedState = 2026;
function random(): number {
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const minutesFrom = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

// -----------------------------------------------------------------------------
// Dados fixos
// -----------------------------------------------------------------------------
const PRICES = {
  CARRO: { toleranciaMinutos: 15, valorPrimeiraHora: 12, valorHoraAdicional: 6, valorDiaria: 60 },
  MOTO: { toleranciaMinutos: 15, valorPrimeiraHora: 6, valorHoraAdicional: 3, valorDiaria: 30 },
} as const;

const CAR_MODELS = ['VW Gol', 'Fiat Argo', 'Chevrolet Onix', 'Hyundai HB20', 'Toyota Corolla', 'Honda Civic', 'Jeep Renegade', 'Renault Kwid', 'Fiat Mobi', 'VW T-Cross', 'Nissan Kicks', 'Toyota Yaris'];
const MOTO_MODELS = ['Honda CG 160', 'Yamaha Fazer 250', 'Honda Biz', 'Yamaha Factor', 'Honda PCX'];
const COLORS = ['Prata', 'Branco', 'Preto', 'Cinza', 'Vermelho', 'Azul'];
const CANCEL_REASONS = ['Placa digitada errada', 'Veículo desistiu de entrar', 'Entrada lançada em duplicidade', 'Vaga errada selecionada'];
const PAID_METHODS = [FormaPagamento.PIX, FormaPagamento.PIX, FormaPagamento.CARTAO, FormaPagamento.CARTAO, FormaPagamento.DINHEIRO];

/** Peso de cada hora do dia nas entradas: picos às 8h, 12h e 18h. */
const HOUR_WEIGHTS = [0, 0, 0, 0, 0, 0, 1, 4, 9, 6, 4, 4, 6, 5, 4, 4, 5, 7, 9, 5, 3, 2, 1, 0];

/** Sorteia uma hora respeitando os pesos acima. */
function randomHour(): number {
  const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let hour = 0; hour < 24; hour++) {
    r -= HOUR_WEIGHTS[hour];
    if (r < 0) return hour;
  }
  return 12;
}

/** Duração realista: algumas dentro da tolerância, a maioria curta, poucas acima de 24h. */
function randomDuration(): number {
  const r = random();
  if (r < 0.08) return randInt(3, 15);
  if (r < 0.62) return randInt(20, 150);
  if (r < 0.94) return randInt(150, 600);
  return randInt(1450, 2 * 1440 + 300);
}

/** Placa aleatória: 75% Mercosul (ABC1D23), 25% padrão antigo (ABC1234). */
function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + randInt(0, 25));
  const digit = () => String(randInt(0, 9));
  return `${letter()}${letter()}${letter()}${digit()}${random() < 0.75 ? letter() : digit()}${digit()}${digit()}`;
}

/** Cópia "congelada" da tabela de preços para gravar na movimentação (regra 5). */
function frozenPrices(type: TipoVeiculo) {
  const p = PRICES[type];
  return {
    precoToleranciaMinutos: p.toleranciaMinutos,
    precoPrimeiraHora: p.valorPrimeiraHora,
    precoHoraAdicional: p.valorHoraAdicional,
    precoDiaria: p.valorDiaria,
  };
}

/** Valor da estadia pela função oficial de tarifa. */
function fee(type: TipoVeiculo, minutes: number): number {
  const p = PRICES[type];
  return fromCents(
    calculateFee(minutes, {
      toleranceMinutes: p.toleranciaMinutos,
      firstHourCents: toCents(p.valorPrimeiraHora),
      additionalHourCents: toCents(p.valorHoraAdicional),
      dailyCents: toCents(p.valorDiaria),
    }),
  );
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed bloqueado com NODE_ENV=production: ele apaga todos os dados.');
  }

  console.log('🧹 Limpando dados...');
  await prisma.movimentacao.deleteMany();
  await prisma.pagamentoMensalidade.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.vaga.deleteMany();
  await prisma.tabelaPreco.deleteMany();

  const today = todayKey();
  const now = new Date();

  // ---------------------------------------------------------------------------
  // Funcionários
  // ---------------------------------------------------------------------------
  console.log('👤 Criando funcionários...');
  const staffPassword = await bcrypt.hash('admin123', 10);
  const operatorPassword = await bcrypt.hash('operador123', 10);
  const admin = await prisma.usuario.create({ data: { nome: 'Mariana Costa', email: 'admin@parkflow.com', senha: staffPassword, role: Role.ADMIN } });
  const operators = await Promise.all([
    prisma.usuario.create({ data: { nome: 'Carlos Lima', email: 'carlos@parkflow.com', senha: operatorPassword, role: Role.OPERADOR } }),
    prisma.usuario.create({ data: { nome: 'Fernanda Rocha', email: 'fernanda@parkflow.com', senha: operatorPassword, role: Role.OPERADOR } }),
  ]);

  // ---------------------------------------------------------------------------
  // Tabela de preços e vagas (Setor A: 20 carros; Setor B: 10 carros + 10 motos)
  // ---------------------------------------------------------------------------
  console.log('🅿️  Criando vagas e tabela de preços...');
  await prisma.tabelaPreco.createMany({
    data: [
      { tipoVeiculo: TipoVeiculo.CARRO, ...PRICES.CARRO },
      { tipoVeiculo: TipoVeiculo.MOTO, ...PRICES.MOTO },
    ],
  });

  const spotData: Prisma.VagaCreateManyInput[] = [
    ...Array.from({ length: 20 }, (_, i) => ({ codigo: `A${String(i + 1).padStart(2, '0')}`, tipo: TipoVeiculo.CARRO, setor: 'A' })),
    ...Array.from({ length: 10 }, (_, i) => ({ codigo: `B${String(i + 1).padStart(2, '0')}`, tipo: TipoVeiculo.CARRO, setor: 'B' })),
    ...Array.from({ length: 10 }, (_, i) => ({ codigo: `M${String(i + 1).padStart(2, '0')}`, tipo: TipoVeiculo.MOTO, setor: 'B' })),
  ];
  // Uma vaga em manutenção, para o mapa mostrar o estado "inativa".
  spotData[19].ativa = false;
  await prisma.vaga.createMany({ data: spotData });
  const spots = await prisma.vaga.findMany({ orderBy: { codigo: 'asc' } });
  const activeSpots = (type: TipoVeiculo) => spots.filter((s) => s.tipo === type && s.ativa);

  // ---------------------------------------------------------------------------
  // Clientes e veículos
  // ---------------------------------------------------------------------------
  console.log('🚗 Criando clientes e veículos...');
  const customerPassword = await bcrypt.hash('cliente123', 10);

  const customerSeeds = [
    { nome: 'Ana Souza', email: 'ana@email.com', telefone: '11987654321', cpf: '52998224725', valorMensal: 250, due: addDays(today, 18), payments: 3,
      vehicles: [{ placa: 'RIO2A18', modelo: 'Fiat Argo', cor: 'Prata', tipo: TipoVeiculo.CARRO }, { placa: 'MOT4C21', modelo: 'Honda CG 160', cor: 'Vermelha', tipo: TipoVeiculo.MOTO }] },
    { nome: 'Bruno Ferreira', email: 'bruno@email.com', telefone: '11976543210', cpf: null, valorMensal: 220, due: addDays(today, 5), payments: 4,
      vehicles: [{ placa: 'BRU-4512', modelo: 'Toyota Corolla', cor: 'Preto', tipo: TipoVeiculo.CARRO }] },
    // Mensalista VENCIDA: venceu há 10 dias e ainda não pagou.
    { nome: 'Carla Mendes', email: 'carla@email.com', telefone: '21998877665', cpf: '11144477735', valorMensal: 200, due: addDays(today, -10), payments: 2,
      vehicles: [{ placa: 'CAR8D33', modelo: 'Jeep Renegade', cor: 'Branco', tipo: TipoVeiculo.CARRO }] },
    { nome: 'Diego Rocha', email: 'diego@email.com', telefone: '31991234567', cpf: null, valorMensal: null, due: null, payments: 0,
      vehicles: [{ placa: 'DGO-7781', modelo: 'VW Polo', cor: 'Cinza', tipo: TipoVeiculo.CARRO }] },
    // Conta "criada pelo Google": sem senha, com googleId e foto.
    { nome: 'Elisa Martins', email: 'elisa.martins@gmail.com', telefone: null, cpf: null, valorMensal: null, due: null, payments: 0, google: true,
      vehicles: [{ placa: 'ELI5F02', modelo: 'Hyundai Creta', cor: 'Azul', tipo: TipoVeiculo.CARRO }] },
    { nome: 'Felipe Andrade', email: 'felipe@email.com', telefone: '41988776655', cpf: null, valorMensal: null, due: null, payments: 0,
      vehicles: [{ placa: 'FEL3G44', modelo: 'Yamaha Fazer 250', cor: 'Preta', tipo: TipoVeiculo.MOTO }] },
  ];

  type RegisteredVehicle = { id: string; placa: string; modelo: string; cor: string; tipo: TipoVeiculo; member: boolean; due: string | null };
  const registered: RegisteredVehicle[] = [];

  for (const c of customerSeeds) {
    const isMember = c.valorMensal !== null;
    const user = await prisma.usuario.create({
      data: {
        nome: c.nome,
        email: c.email,
        role: Role.CLIENTE,
        senha: 'google' in c ? null : customerPassword,
        googleId: 'google' in c ? 'seed-google-elisa-martins' : null,
        avatarUrl: 'google' in c ? 'https://i.pravatar.cc/150?img=47' : null,
        cliente: {
          create: {
            telefone: c.telefone,
            cpf: c.cpf,
            mensalista: isMember,
            valorMensal: c.valorMensal,
            dataVencimento: c.due ? keyToDateOnly(c.due) : null,
            veiculos: { create: c.vehicles.map((v) => ({ ...v, placa: normalizePlate(v.placa) })) },
          },
        },
      },
      include: { cliente: { include: { veiculos: true } } },
    });
    const customer = user.cliente!;
    customer.veiculos.forEach((v) => registered.push({ ...v, member: isMember, due: c.due }));

    // Histórico de pagamentos: um por mês antes do vencimento atual.
    for (let i = 1; i <= c.payments; i++) {
      const paidDueKey = addMonths(c.due!, -i);
      await prisma.pagamentoMensalidade.create({
        data: {
          clienteId: customer.id,
          valor: c.valorMensal!,
          referenciaMes: paidDueKey.slice(0, 7),
          dataPagamento: minutesFrom(startOfDay(addDays(paidDueKey, -randInt(0, 3))), randInt(9 * 60, 17 * 60)),
          operadorId: pick(operators).id,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Histórico dos últimos 30 dias
  // ---------------------------------------------------------------------------
  console.log('📈 Gerando movimentações dos últimos 30 dias...');
  const history: Prisma.MovimentacaoCreateManyInput[] = [];

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const dayKey = addDays(today, -daysAgo);
    const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay();
    const count = weekday === 0 ? randInt(10, 16) : weekday === 6 ? randInt(18, 26) : randInt(28, 42);

    for (let i = 0; i < count; i++) {
      const entry = minutesFrom(startOfDay(dayKey), randomHour() * 60 + randInt(0, 59));
      const minutes = randomDuration();
      const exit = minutesFrom(entry, minutes);
      if (exit > minutesFrom(now, -5)) continue; // ainda não saiu: os que estão no pátio são criados abaixo

      // 12% são veículos cadastrados; o resto, avulsos.
      const vehicle = random() < 0.12 ? pick(registered) : null;
      const type = vehicle?.tipo ?? (random() < 0.15 ? TipoVeiculo.MOTO : TipoVeiculo.CARRO);
      const operatorIn = pick(operators);
      const base = {
        placa: vehicle?.placa ?? randomPlate(),
        tipoVeiculo: type,
        modelo: vehicle?.modelo ?? pick(type === TipoVeiculo.CARRO ? CAR_MODELS : MOTO_MODELS),
        cor: vehicle?.cor ?? pick(COLORS),
        vagaId: pick(activeSpots(type)).id,
        veiculoId: vehicle?.id ?? null,
        operadorEntradaId: operatorIn.id,
        dataHoraEntrada: entry,
        ...frozenPrices(type),
      };

      // ~3% canceladas (lançadas por engano): não entram no faturamento.
      if (random() < 0.03) {
        history.push({
          ...base,
          status: StatusMovimentacao.CANCELADA,
          motivoCancelamento: pick(CANCEL_REASONS),
          dataHoraSaida: minutesFrom(entry, randInt(2, 10)),
          operadorSaidaId: operatorIn.id,
        });
        continue;
      }

      // Mensalista em dia na data da saída → coberto pela mensalidade (regra 6).
      const covered = Boolean(vehicle?.member && vehicle.due && vehicle.due >= dayKey);
      const value = covered ? 0 : fee(type, minutes);
      history.push({
        ...base,
        status: StatusMovimentacao.FINALIZADA,
        dataHoraSaida: exit,
        operadorSaidaId: pick(operators).id,
        valorCobrado: value,
        formaPagamento: covered ? FormaPagamento.MENSALISTA : value > 0 ? pick(PAID_METHODS) : null,
      });
    }
  }
  await prisma.movimentacao.createMany({ data: history });

  // ---------------------------------------------------------------------------
  // Veículos no pátio agora (movimentações ABERTAS, em vagas e placas distintas)
  // ---------------------------------------------------------------------------
  console.log('🅿️  Colocando veículos no pátio...');
  const shuffle = <T>(items: T[]) => [...items].sort(() => random() - 0.5);
  const freeCarSpots = shuffle(activeSpots(TipoVeiculo.CARRO));
  const freeMotoSpots = shuffle(activeSpots(TipoVeiculo.MOTO));
  const byPlate = (plate: string) => registered.find((v) => v.placa === normalizePlate(plate))!;

  const parked = [
    // Ana (mensalista em dia) e Carla (mensalista vencida) estão no pátio, para demonstrar a regra 6.
    { vehicle: byPlate('RIO2A18') },
    { vehicle: byPlate('CAR8D33') },
    { vehicle: byPlate('DGO-7781') },
    ...Array.from({ length: 11 }, () => ({ vehicle: null, type: TipoVeiculo.CARRO })),
    ...Array.from({ length: 3 }, () => ({ vehicle: null, type: TipoVeiculo.MOTO })),
  ];

  for (const [index, item] of parked.entries()) {
    const type = item.vehicle?.tipo ?? (item as { type: TipoVeiculo }).type;
    const spot = (type === TipoVeiculo.CARRO ? freeCarSpots : freeMotoSpots).shift()!;
    await prisma.movimentacao.create({
      data: {
        placa: item.vehicle?.placa ?? randomPlate(),
        tipoVeiculo: type,
        modelo: item.vehicle?.modelo ?? pick(type === TipoVeiculo.CARRO ? CAR_MODELS : MOTO_MODELS),
        cor: item.vehicle?.cor ?? pick(COLORS),
        vagaId: spot.id,
        veiculoId: item.vehicle?.id ?? null,
        operadorEntradaId: pick(operators).id,
        dataHoraEntrada: minutesFrom(now, -randInt(8, 420)),
        avariasObservadas: index === 4 ? 'Risco na porta traseira esquerda' : null,
        ...frozenPrices(type),
      },
    });
  }

  const [movements, canceled, open] = await Promise.all([
    prisma.movimentacao.count(),
    prisma.movimentacao.count({ where: { status: StatusMovimentacao.CANCELADA } }),
    prisma.movimentacao.count({ where: { status: StatusMovimentacao.ABERTA } }),
  ]);
  console.log(`✅ Seed concluído: ${spots.length} vagas, ${customerSeeds.length} clientes, ${movements} movimentações (${open} no pátio, ${canceled} canceladas).`);
  console.log(`   Admin: ${admin.email} / admin123`);
}

main()
  .catch((err) => {
    console.error('❌ Erro no seed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
