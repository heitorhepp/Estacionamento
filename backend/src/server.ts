/**
 * server.ts
 * Ponto de entrada: sobe o servidor HTTP na porta configurada.
 */
import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`🚗 API rodando em http://localhost:${env.PORT}/api`);
});
