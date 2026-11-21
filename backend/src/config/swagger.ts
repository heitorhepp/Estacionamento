/**
 * swagger.ts
 * Configuração da documentação OpenAPI (Swagger), servida em /api-docs.
 *
 * Os caminhos (paths) são lidos dos comentários @openapi em cada arquivo de rotas,
 * então a documentação fica ao lado do código que ela descreve. Aqui ficam só as
 * definições compartilhadas: segurança (Bearer JWT), schemas e respostas de erro.
 */
import path from 'node:path';
import swaggerJSDoc from 'swagger-jsdoc';

/** Respostas de erro reutilizadas nas rotas (todas no formato { message }). */
const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const money = { type: 'number', example: 12.5 };
const uuid = { type: 'string', format: 'uuid' };
const dateKey = { type: 'string', example: '2026-11-20', description: 'Data no formato AAAA-MM-DD' };
const vehicleType = { type: 'string', enum: ['CARRO', 'MOTO'] };

const definition: swaggerJSDoc.OAS3Definition = {
  openapi: '3.0.3',
  info: {
    title: 'API — Sistema de Controle de Estacionamento',
    version: '1.0.0',
    description:
      'API do painel interno (ADMIN/OPERADOR) e do portal do cliente.\n\n' +
      '**Como testar:** faça login em `POST /auth/login`, copie o `token` e clique em **Authorize** (cadeado).\n\n' +
      'Todas as datas/horas são em UTC (ISO 8601); agrupamentos por dia usam o fuso America/Sao_Paulo. ' +
      'Valores `Decimal` do banco são devolvidos como texto (ex.: `"12.50"`).',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Auth', description: 'Login (email/senha e Google) e cadastro do cliente' },
    { name: 'Funcionários', description: 'CRUD de ADMIN e OPERADOR (somente ADMIN)' },
    { name: 'Clientes', description: 'Clientes, mensalistas e pagamentos de mensalidade' },
    { name: 'Veículos', description: 'Veículos cadastrados (cliente vê só os próprios)' },
    { name: 'Vagas', description: 'Mapa de vagas, vagas livres (público) e CRUD' },
    { name: 'Preços', description: 'Tabela de preços por tipo de veículo' },
    { name: 'Movimentações', description: 'Entrada, saída, cancelamento e histórico' },
    { name: 'Dashboard', description: 'Indicadores do ADMIN' },
    { name: 'IA', description: 'Assistente com Google Gemini' },
    { name: 'Portal do cliente', description: 'Perfil, estadias e mensalidade do cliente logado' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      IdParam: { name: 'id', in: 'path', required: true, schema: uuid },
      Page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
      PageSize: { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
    },
    responses: {
      BadRequest: {
        description: 'Dados inválidos',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
      },
      Unauthorized: errorResponse('Não autenticado ou token expirado'),
      Forbidden: errorResponse('Sem permissão para este recurso'),
      NotFound: errorResponse('Registro não encontrado'),
      Conflict: errorResponse('Conflito com o estado atual (duplicado, vaga ocupada, já finalizada...)'),
      PayloadTooLarge: errorResponse('Imagem maior que 5 MB'),
      TooManyRequests: errorResponse('Limite de requisições da IA atingido'),
      ServiceUnavailable: errorResponse('Integração não configurada ou indisponível'),
    },
    schemas: {
      Error: { type: 'object', properties: { message: { type: 'string', example: 'Mensagem de erro em português.' } } },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Verifique os dados informados.' },
          errors: {
            type: 'array',
            items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
          },
        },
      },
      Paginated: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { type: 'object' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: uuid,
          nome: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'OPERADOR', 'CLIENTE'] },
          avatarUrl: { type: 'string', nullable: true },
          temSenha: { type: 'boolean' },
          temGoogle: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: { token: { type: 'string' }, usuario: { $ref: '#/components/schemas/User' } },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'senha'],
        properties: { email: { type: 'string', example: 'admin@estacionamento.com' }, senha: { type: 'string', example: 'admin123' } },
      },
      RegisterInput: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string' },
          email: { type: 'string' },
          senha: { type: 'string', minLength: 8 },
          telefone: { type: 'string', nullable: true },
          cpf: { type: 'string', nullable: true, example: '123.456.789-09' },
        },
      },
      EmployeeInput: {
        type: 'object',
        required: ['nome', 'email', 'senha', 'role'],
        properties: {
          nome: { type: 'string' },
          email: { type: 'string' },
          senha: { type: 'string', minLength: 8, description: 'Na edição, opcional' },
          role: { type: 'string', enum: ['ADMIN', 'OPERADOR'] },
        },
      },
      CustomerInput: {
        type: 'object',
        required: ['nome', 'email'],
        properties: {
          nome: { type: 'string' },
          email: { type: 'string' },
          senha: { type: 'string', minLength: 8, description: 'Opcional (só na criação)' },
          telefone: { type: 'string', nullable: true },
          cpf: { type: 'string', nullable: true },
          mensalista: { type: 'boolean', default: false },
          valorMensal: { ...money, nullable: true, description: 'Obrigatório se mensalista' },
          dataVencimento: { ...dateKey, nullable: true },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: uuid,
          usuarioId: uuid,
          cpf: { type: 'string', nullable: true },
          telefone: { type: 'string', nullable: true },
          mensalista: { type: 'boolean' },
          valorMensal: { type: 'string', nullable: true, example: '200.00' },
          dataVencimento: { ...dateKey, nullable: true },
          situacaoMensalidade: { type: 'string', enum: ['EM_DIA', 'VENCIDA', 'NAO_MENSALISTA'] },
          usuario: { type: 'object', properties: { id: uuid, nome: { type: 'string' }, email: { type: 'string' } } },
        },
      },
      PaymentInput: {
        type: 'object',
        required: ['referenciaMes'],
        properties: {
          referenciaMes: { type: 'string', example: '2026-11' },
          valor: { ...money, description: 'Opcional; padrão = valorMensal do cliente' },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: uuid,
          clienteId: uuid,
          valor: { type: 'string', example: '200.00' },
          dataPagamento: { type: 'string', format: 'date-time' },
          referenciaMes: { type: 'string', example: '2026-11' },
          novoVencimento: { ...dateKey, description: 'Só na resposta do registro' },
        },
      },
      VehicleInput: {
        type: 'object',
        required: ['placa', 'modelo', 'cor', 'tipo'],
        properties: {
          placa: { type: 'string', example: 'ABC-1234', description: 'Antigo (ABC-1234) ou Mercosul (ABC1D23)' },
          modelo: { type: 'string', example: 'Fiat Argo' },
          cor: { type: 'string', example: 'Prata' },
          tipo: vehicleType,
          clienteId: { ...uuid, description: 'Obrigatório para ADMIN/OPERADOR; ignorado para CLIENTE' },
        },
      },
      Vehicle: {
        type: 'object',
        properties: {
          id: uuid,
          clienteId: uuid,
          placa: { type: 'string', example: 'ABC1234' },
          modelo: { type: 'string' },
          cor: { type: 'string' },
          tipo: vehicleType,
          fotoUrl: { type: 'string', nullable: true },
        },
      },
      SpotInput: {
        type: 'object',
        required: ['codigo', 'tipo', 'setor'],
        properties: {
          codigo: { type: 'string', example: 'A01' },
          tipo: vehicleType,
          setor: { type: 'string', example: 'A' },
          ativa: { type: 'boolean', default: true },
        },
      },
      Spot: {
        type: 'object',
        properties: {
          id: uuid,
          codigo: { type: 'string' },
          tipo: vehicleType,
          setor: { type: 'string' },
          ativa: { type: 'boolean' },
          status: { type: 'string', enum: ['LIVRE', 'OCUPADA', 'INATIVA'] },
          movimentacaoAtual: { type: 'object', nullable: true, description: 'Placa, foto e horário de entrada, se ocupada' },
        },
      },
      Occupancy: {
        type: 'object',
        properties: {
          tipo: vehicleType,
          total: { type: 'integer' },
          ocupadas: { type: 'integer' },
          livres: { type: 'integer' },
          percentualOcupacao: { type: 'integer' },
        },
      },
      PriceInput: {
        type: 'object',
        required: ['toleranciaMinutos', 'valorPrimeiraHora', 'valorHoraAdicional', 'valorDiaria'],
        properties: {
          toleranciaMinutos: { type: 'integer', example: 15 },
          valorPrimeiraHora: { ...money, example: 10 },
          valorHoraAdicional: { ...money, example: 5 },
          valorDiaria: { ...money, example: 50 },
        },
      },
      EntryInput: {
        type: 'object',
        required: ['placa', 'tipoVeiculo', 'modelo', 'cor', 'vagaId'],
        properties: {
          placa: { type: 'string', example: 'ABC1D23' },
          tipoVeiculo: vehicleType,
          modelo: { type: 'string' },
          cor: { type: 'string' },
          vagaId: uuid,
          avariasObservadas: { type: 'string', nullable: true },
          fotoEntradaUrl: { type: 'string', nullable: true, description: 'URL devolvida por POST /movimentacoes/entrada/foto' },
        },
      },
      PhotoAnalysis: {
        type: 'object',
        properties: {
          fotoUrl: { type: 'string', nullable: true },
          sugestao: {
            type: 'object',
            nullable: true,
            properties: {
              placa: { type: 'string', nullable: true },
              modelo: { type: 'string', nullable: true },
              cor: { type: 'string', nullable: true },
              tipoVeiculo: { ...vehicleType, nullable: true },
              avarias: { type: 'string', nullable: true },
            },
          },
          avisos: { type: 'array', items: { type: 'string' }, description: 'Falhas não bloqueantes (IA ou upload)' },
        },
      },
      Movement: {
        type: 'object',
        properties: {
          id: uuid,
          placa: { type: 'string' },
          tipoVeiculo: vehicleType,
          modelo: { type: 'string' },
          cor: { type: 'string' },
          status: { type: 'string', enum: ['ABERTA', 'FINALIZADA', 'CANCELADA'] },
          dataHoraEntrada: { type: 'string', format: 'date-time' },
          dataHoraSaida: { type: 'string', format: 'date-time', nullable: true },
          valorCobrado: { type: 'string', nullable: true },
          formaPagamento: { type: 'string', enum: ['PIX', 'DINHEIRO', 'CARTAO', 'MENSALISTA'], nullable: true },
          fotoEntradaUrl: { type: 'string', nullable: true },
          motivoCancelamento: { type: 'string', nullable: true },
          vaga: { type: 'object', properties: { id: uuid, codigo: { type: 'string' }, setor: { type: 'string' } } },
        },
      },
      ExitPreview: {
        type: 'object',
        properties: {
          movimentacaoId: uuid,
          placa: { type: 'string' },
          vaga: { type: 'string' },
          dataHoraEntrada: { type: 'string', format: 'date-time' },
          dataHoraSaida: { type: 'string', format: 'date-time' },
          minutosPermanencia: { type: 'integer' },
          valorCobrado: money,
          cobertoPorMensalidade: { type: 'boolean' },
          observacao: { type: 'string', nullable: true },
          precos: { type: 'object', description: 'Preços congelados na entrada' },
        },
      },
    },
  },
};

// O glob usa "/" mesmo no Windows; lê .ts (dev com tsx) e .js (produção, dist/).
const routesGlob = path.join(__dirname, '../routes/*.{ts,js}').replace(/\\/g, '/');

/** Especificação OpenAPI final (definições acima + paths dos comentários das rotas). */
export const swaggerSpec = swaggerJSDoc({ definition, apis: [routesGlob] });
