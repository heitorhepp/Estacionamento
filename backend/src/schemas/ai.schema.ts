/**
 * ai.schema.ts
 * Validação da pergunta enviada ao assistente de IA e da resposta da IA na leitura da foto.
 */
import { z } from 'zod';
import { TipoVeiculo } from '@prisma/client';
import { isValidPlate, normalizePlate } from '../utils/plate';

export const askAssistantSchema = z.object({
  pergunta: z.string().trim().min(3, 'Escreva uma pergunta.').max(500, 'A pergunta deve ter no máximo 500 caracteres.'),
});

/** Texto opcional: vazio vira null e textos longos são cortados (não reprova a resposta toda). */
const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((value) => value?.trim().slice(0, max) || null);

/**
 * Resposta esperada do Gemini na leitura da foto de entrada.
 * NUNCA confiamos cegamente na IA: o JSON é validado aqui, a placa é normalizada e,
 * se vier num formato inválido, é descartada (o operador digita).
 */
export const vehicleSuggestionSchema = z.object({
  placa: z
    .string()
    .nullish()
    .transform((value) => {
      const plate = value ? normalizePlate(value) : '';
      return isValidPlate(plate) ? plate : null;
    }),
  modelo: optionalText(50),
  cor: optionalText(30),
  tipoVeiculo: z
    .enum(TipoVeiculo)
    .nullish()
    .catch(null)
    .transform((value) => value ?? null),
  avarias: optionalText(500),
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;
export type VehicleSuggestion = z.infer<typeof vehicleSuggestionSchema>;
