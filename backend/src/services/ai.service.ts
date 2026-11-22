/**
 * ai.service.ts
 * Toda a integração com o Google Gemini fica aqui:
 * 1. Leitura da foto de entrada → sugestão de placa, modelo, cor, tipo e avarias.
 * 2. Assistente do ADMIN → responde perguntas sobre um RESUMO de dados agregados.
 * 3. Tradução dos erros da API (limite de requisições, indisponibilidade) em mensagens amigáveis.
 *
 * Princípio: a IA SUGERE, quem decide é a pessoa. Na entrada, o operador sempre confirma
 * ou corrige os campos; no assistente, a IA só vê números agregados, nunca o banco.
 */
import { ApiError, Type } from '@google/genai';
import { gemini, geminiModel } from '../config/gemini';
import { AppError } from '../utils/AppError';
import { todayKey, weekdayName } from '../utils/date';
import { VehicleSuggestion, vehicleSuggestionSchema } from '../schemas/ai.schema';
import { getDashboard } from './dashboard.service';

/**
 * Garante que o Gemini está configurado.
 * @throws 503 se GEMINI_API_KEY ou GEMINI_MODEL estiverem ausentes.
 */
function requireGemini() {
  if (!gemini || !geminiModel) {
    throw new AppError('A IA não está configurada no servidor (GEMINI_API_KEY / GEMINI_MODEL).', 503);
  }
  return { client: gemini, model: geminiModel };
}

/**
 * Converte qualquer erro da chamada ao Gemini em AppError com mensagem amigável.
 * O erro original vai para o log do servidor, não para o usuário.
 * @param err Erro lançado pelo SDK.
 * @returns AppError pronto para lançar.
 */
function toFriendlyAiError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  console.error('Erro na chamada ao Gemini:', err);

  if (err instanceof ApiError) {
    // 429 = cota/limite de requisições do plano gratuito estourado.
    if (err.status === 429) {
      return new AppError('A IA atingiu o limite de requisições. Aguarde cerca de um minuto e tente novamente.', 429);
    }
    // 404 = o modelo de GEMINI_MODEL não existe ou foi descontinuado pelo Google.
    if (err.status === 404) {
      return new AppError(`O modelo de IA "${geminiModel}" não está disponível. Atualize GEMINI_MODEL no servidor.`, 503);
    }
    if (err.status === 401 || err.status === 403) {
      return new AppError('A chave da IA é inválida ou não tem permissão. Avise o administrador.', 503);
    }
    if (err.status === 503) {
      return new AppError('O Gemini está com alta demanda no momento. Aguarde alguns instantes e tente novamente.', 503);
    }
  }
  return new AppError('O serviço de IA está indisponível no momento. Tente novamente em instantes.', 502);
}

/**
 * Formato da resposta pedida ao Gemini na leitura da foto.
 * Com responseMimeType JSON + responseSchema, o modelo é obrigado a devolver um JSON
 * nesse formato (em vez de texto livre que teríamos que "garimpar").
 */
const vehicleResponseSchema = {
  type: Type.OBJECT,
  properties: {
    placa: { type: Type.STRING, nullable: true, description: 'Placa como aparece na imagem, ou null se ilegível' },
    modelo: { type: Type.STRING, nullable: true, description: 'Marca e modelo, ex.: "Fiat Argo"' },
    cor: { type: Type.STRING, nullable: true, description: 'Cor predominante em português, ex.: "Prata"' },
    tipoVeiculo: { type: Type.STRING, enum: ['CARRO', 'MOTO'], nullable: true },
    avarias: { type: Type.STRING, nullable: true, description: 'Avarias visíveis (riscos, amassados), ou null se nenhuma' },
  },
  required: ['placa', 'modelo', 'cor', 'tipoVeiculo', 'avarias'],
};

const VEHICLE_PROMPT = `Você é um assistente de um estacionamento no Brasil.
Analise a foto do veículo e extraia: placa (padrão antigo ABC-1234 ou Mercosul ABC1D23),
marca/modelo, cor predominante (em português), tipo (CARRO ou MOTO) e avarias visíveis.
Se não tiver certeza de algum campo, use null. Não invente placas.`;

/**
 * Lê a foto de entrada com o Gemini e devolve sugestões para o formulário.
 * @param file Imagem recebida pelo Multer (buffer em memória).
 * @returns Sugestão validada pelo Zod (campos não reconhecidos vêm como null).
 * @throws AppError com mensagem amigável se a IA falhar.
 */
export async function analyzeVehiclePhoto(file: Express.Multer.File): Promise<VehicleSuggestion> {
  const { client, model } = requireGemini();

  try {
    const response = await client.models.generateContent({
      model,
      // A imagem vai embutida em base64 (inlineData): não precisa de URL pública.
      contents: [{ inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } }, { text: VEHICLE_PROMPT }],
      config: { responseMimeType: 'application/json', responseSchema: vehicleResponseSchema, temperature: 0 },
    });

    return parseVehicleSuggestion(response.text);
  } catch (err) {
    throw toFriendlyAiError(err);
  }
}

/**
 * Converte o texto devolvido pelo Gemini em sugestão validada.
 * Separada (e exportada) para poder ser testada sem chamar a API.
 * @param text Texto JSON da resposta.
 * @throws AppError 502 se o texto não for um JSON no formato esperado.
 */
export function parseVehicleSuggestion(text: string | undefined): VehicleSuggestion {
  try {
    return vehicleSuggestionSchema.parse(JSON.parse(text ?? ''));
  } catch {
    throw new AppError('A IA devolveu uma resposta em formato inesperado. Preencha os campos manualmente.', 502);
  }
}

/**
 * Monta o resumo de dados que o assistente pode ver.
 * SÓ números agregados (por dia, por hora, totais) — nenhuma placa, nome, email ou CPF.
 * A IA nunca consulta o banco diretamente: ela só conhece este objeto.
 */
async function buildDataSummary() {
  const dashboard = await getDashboard({}); // últimos 30 dias
  return {
    hoje: `${todayKey()} (${weekdayName(todayKey())})`,
    periodoAnalisado: dashboard.periodo,
    situacaoAtual: dashboard.cards,
    porDia: dashboard.graficos.faturamentoDiario.map((day) => ({ ...day, diaSemana: weekdayName(day.data) })),
    entradasPorHoraDoDia: dashboard.graficos.movimentoPorHora,
    receitaPorOrigemNoPeriodo: dashboard.graficos.receitaPorOrigem,
  };
}

const ASSISTANT_INSTRUCTIONS = `Você é o assistente de gestão de um estacionamento.
Responda em português do Brasil, de forma curta e direta (no máximo 1 parágrafo ou uma lista curta).
Use SOMENTE os dados em JSON fornecidos. Se a resposta não estiver nos dados, diga isso claramente.
Valores em reais no formato R$ 1.234,56. Tempos no formato "2h 35min".
"entradas" = veículos que entraram; "estadias" = receita de clientes avulsos; "mensalidades" = receita de mensalistas.
Movimentações canceladas já foram excluídas dos dados.`;

/**
 * Responde uma pergunta do ADMIN em linguagem natural.
 * @param question Ex.: "qual dia teve mais movimento esta semana?"
 * @returns { resposta } em texto.
 */
export async function askAssistant(question: string) {
  const { client, model } = requireGemini();
  const summary = await buildDataSummary();

  try {
    let response;
    let lastError: unknown;

    for (const candidate of [model, 'gemini-3.6-flash', 'gemini-2.5-flash-lite'].filter((name, index, names) => names.indexOf(name) === index)) {
      try {
        response = await client.models.generateContent({
          model: candidate,
          contents: `DADOS:\n${JSON.stringify(summary)}\n\nPERGUNTA: ${question}`,
          config: { systemInstruction: ASSISTANT_INSTRUCTIONS, temperature: 0.2 },
        });
        break;
      } catch (err) {
        lastError = err;
        if (!(err instanceof ApiError) || (err.status !== 503 && err.status !== 429 && err.status !== 404)) throw err;
      }
    }

    if (!response) throw lastError;

    const answer = response.text?.trim();
    if (!answer) throw new AppError('A IA não conseguiu responder. Tente reformular a pergunta.', 502);
    return { resposta: answer };
  } catch (err) {
    throw toFriendlyAiError(err);
  }
}
