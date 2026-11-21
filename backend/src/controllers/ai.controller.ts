/**
 * ai.controller.ts
 * Handler HTTP do assistente de IA do ADMIN.
 */
import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';

/** POST /ai/assistente */
export async function ask(req: Request, res: Response) {
  res.json(await aiService.askAssistant(req.body.pergunta));
}
