/**
 * types/index.ts
 * Tipos das respostas da API, espelhando o back-end.
 * Valores Decimal do banco chegam como texto (ex.: "12.50"); números calculados
 * (pré-visualização, dashboard) chegam como number.
 */

export type Role = 'ADMIN' | 'OPERADOR' | 'CLIENTE';
export type VehicleType = 'CARRO' | 'MOTO';
export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO' | 'MENSALISTA';
export type MovementStatus = 'ABERTA' | 'FINALIZADA' | 'CANCELADA';
export type MembershipStatus = 'EM_DIA' | 'VENCIDA' | 'NAO_MENSALISTA';
export type SpotStatus = 'LIVRE' | 'OCUPADA' | 'INATIVA';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  temSenha: boolean;
  temGoogle: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  usuario: User;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Occupancy {
  tipo: VehicleType;
  total: number;
  ocupadas: number;
  livres: number;
  percentualOcupacao: number;
}

export interface Spot {
  id: string;
  codigo: string;
  tipo: VehicleType;
  setor: string;
  ativa: boolean;
  status: SpotStatus;
  movimentacaoAtual: {
    id: string;
    placa: string;
    modelo: string;
    cor: string;
    tipoVeiculo: VehicleType;
    fotoEntradaUrl: string | null;
    dataHoraEntrada: string;
  } | null;
}

export interface Price {
  id: string;
  tipoVeiculo: VehicleType;
  toleranciaMinutos: number;
  valorPrimeiraHora: string;
  valorHoraAdicional: string;
  valorDiaria: string;
}

export interface Movement {
  id: string;
  placa: string;
  tipoVeiculo: VehicleType;
  modelo: string;
  cor: string;
  fotoEntradaUrl: string | null;
  avariasObservadas: string | null;
  dataHoraEntrada: string;
  dataHoraSaida: string | null;
  valorCobrado: string | null;
  formaPagamento: PaymentMethod | null;
  status: MovementStatus;
  motivoCancelamento: string | null;
  precoToleranciaMinutos: number;
  precoPrimeiraHora: string;
  precoHoraAdicional: string;
  precoDiaria: string;
  vaga: { id: string; codigo: string; setor: string; tipo: VehicleType };
  veiculo: { id: string; placa: string; cliente: { id: string; mensalista: boolean; usuario: { nome: string } } } | null;
  operadorEntrada: { id: string; nome: string };
  operadorSaida: { id: string; nome: string } | null;
}

export interface ExitPreview {
  movimentacaoId: string;
  placa: string;
  vaga: string;
  dataHoraEntrada: string;
  dataHoraSaida: string;
  minutosPermanencia: number;
  valorCobrado: number;
  cobertoPorMensalidade: boolean;
  observacao: string | null;
  precos: { toleranciaMinutos: number; primeiraHora: string; horaAdicional: string; diaria: string };
}

export interface VehicleSuggestion {
  placa: string | null;
  modelo: string | null;
  cor: string | null;
  tipoVeiculo: VehicleType | null;
  avarias: string | null;
}

export interface PhotoAnalysis {
  fotoUrl: string | null;
  sugestao: VehicleSuggestion | null;
  avisos: string[];
}

export interface Payment {
  id: string;
  clienteId: string;
  valor: string;
  dataPagamento: string;
  referenciaMes: string;
  operador?: { id: string; nome: string };
}

export interface Vehicle {
  id: string;
  clienteId: string;
  placa: string;
  modelo: string;
  cor: string;
  tipo: VehicleType;
  fotoUrl: string | null;
  cliente?: { id: string; usuario: { nome: string } };
}

export interface Customer {
  id: string;
  usuarioId: string;
  cpf: string | null;
  telefone: string | null;
  mensalista: boolean;
  valorMensal: string | null;
  dataVencimento: string | null;
  situacaoMensalidade: MembershipStatus;
  usuario: { id: string; nome: string; email: string; avatarUrl: string | null };
  _count?: { veiculos: number };
  veiculos?: Vehicle[];
  pagamentos?: Payment[];
}

export type Employee = Pick<User, 'id' | 'nome' | 'email' | 'role' | 'avatarUrl' | 'createdAt'>;

export interface RevenueTotals {
  estadias: number;
  mensalidades: number;
  total: number;
}

export interface Dashboard {
  periodo: { dataInicio: string; dataFim: string };
  cards: {
    ocupacao: Occupancy[];
    veiculosNoPatio: number;
    faturamentoHoje: RevenueTotals;
    faturamentoMes: RevenueTotals;
    tempoMedioPermanenciaMinutos: number;
    mensalistasVencidos: number;
  };
  graficos: {
    faturamentoDiario: Array<RevenueTotals & { data: string; entradas: number }>;
    movimentoPorHora: Array<{ hora: number; entradas: number }>;
    receitaPorOrigem: Array<{ origem: string; valor: number }>;
  };
}

export interface CustomerProfile extends User {
  cpf: string | null;
  telefone: string | null;
  mensalista: boolean;
}

export interface Stay {
  id: string;
  placa: string;
  modelo: string;
  tipoVeiculo: VehicleType;
  dataHoraEntrada: string;
  dataHoraSaida: string | null;
  valorCobrado: string | null;
  formaPagamento: PaymentMethod | null;
  status: MovementStatus;
  vaga: { codigo: string; setor: string };
  minutosPermanencia: number;
}

export interface MembershipInfo {
  situacao: MembershipStatus;
  valorMensal: string | null;
  dataVencimento: string | null;
  pagamentos: Array<Pick<Payment, 'id' | 'valor' | 'dataPagamento' | 'referenciaMes'>>;
}
