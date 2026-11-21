-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERADOR', 'CLIENTE');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('CARRO', 'MOTO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO', 'MENSALISTA');

-- CreateEnum
CREATE TYPE "StatusMovimentacao" AS ENUM ('ABERTA', 'FINALIZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT,
    "googleId" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "mensalista" BOOLEAN NOT NULL DEFAULT false,
    "valorMensal" DECIMAL(10,2),
    "dataVencimento" DATE,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoMensalidade" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataPagamento" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenciaMes" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,

    CONSTRAINT "PagamentoMensalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veiculo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "tipo" "TipoVeiculo" NOT NULL,
    "fotoUrl" TEXT,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaga" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoVeiculo" NOT NULL,
    "setor" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Vaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TabelaPreco" (
    "id" TEXT NOT NULL,
    "tipoVeiculo" "TipoVeiculo" NOT NULL,
    "toleranciaMinutos" INTEGER NOT NULL,
    "valorPrimeiraHora" DECIMAL(10,2) NOT NULL,
    "valorHoraAdicional" DECIMAL(10,2) NOT NULL,
    "valorDiaria" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "TabelaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimentacao" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipoVeiculo" "TipoVeiculo" NOT NULL,
    "modelo" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "veiculoId" TEXT,
    "fotoEntradaUrl" TEXT,
    "avariasObservadas" TEXT,
    "operadorEntradaId" TEXT NOT NULL,
    "operadorSaidaId" TEXT,
    "dataHoraEntrada" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataHoraSaida" TIMESTAMPTZ(6),
    "precoToleranciaMinutos" INTEGER NOT NULL,
    "precoPrimeiraHora" DECIMAL(10,2) NOT NULL,
    "precoHoraAdicional" DECIMAL(10,2) NOT NULL,
    "precoDiaria" DECIMAL(10,2) NOT NULL,
    "valorCobrado" DECIMAL(10,2),
    "formaPagamento" "FormaPagamento",
    "status" "StatusMovimentacao" NOT NULL DEFAULT 'ABERTA',
    "motivoCancelamento" TEXT,

    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "Usuario"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_usuarioId_key" ON "Cliente"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cpf_key" ON "Cliente"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoMensalidade_clienteId_referenciaMes_key" ON "PagamentoMensalidade"("clienteId", "referenciaMes");

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_placa_key" ON "Veiculo"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Vaga_codigo_key" ON "Vaga"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TabelaPreco_tipoVeiculo_key" ON "TabelaPreco"("tipoVeiculo");

-- CreateIndex
CREATE INDEX "Movimentacao_placa_status_idx" ON "Movimentacao"("placa", "status");

-- CreateIndex
CREATE INDEX "Movimentacao_vagaId_status_idx" ON "Movimentacao"("vagaId", "status");

-- CreateIndex
CREATE INDEX "Movimentacao_status_dataHoraEntrada_idx" ON "Movimentacao"("status", "dataHoraEntrada");

-- CreateIndex
CREATE INDEX "Movimentacao_veiculoId_status_idx" ON "Movimentacao"("veiculoId", "status");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoMensalidade" ADD CONSTRAINT "PagamentoMensalidade_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoMensalidade" ADD CONSTRAINT "PagamentoMensalidade_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Veiculo" ADD CONSTRAINT "Veiculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_operadorEntradaId_fkey" FOREIGN KEY ("operadorEntradaId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_operadorSaidaId_fkey" FOREIGN KEY ("operadorSaidaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

