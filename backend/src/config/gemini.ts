/**
 * gemini.ts
 * Cria o client do Google Gemini (SDK oficial @google/genai).
 * Chave e modelo vêm do .env (GEMINI_API_KEY e GEMINI_MODEL), nunca fixos no código,
 * para poder trocar de modelo ou de chave sem alterar o código.
 */
import { GoogleGenAI } from '@google/genai';
import { env } from './env';

/** Nome do modelo configurado (ex.: gemini-2.5-flash). */
export const geminiModel = env.GEMINI_MODEL;

/** Client do Gemini, ou null se a chave/modelo não estiverem configurados. */
export const gemini =
  env.GEMINI_API_KEY && env.GEMINI_MODEL
    ? // Timeout de 30 s: sem ele, uma API lenta deixaria a requisição pendurada.
      new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: 30_000 } })
    : null;
