/**
 * AppError.ts
 * Erro "esperado" da aplicação: carrega a mensagem para o usuário e o status HTTP.
 * Os services lançam AppError; o middleware errorHandler transforma em resposta JSON.
 */
export class AppError extends Error {
  /**
   * @param message Mensagem em português exibida ao usuário.
   * @param statusCode Status HTTP (400 por padrão).
   */
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
