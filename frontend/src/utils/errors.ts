/**
 * errors.ts
 * Extrai mensagens amigáveis dos erros da API (formato { message, errors? }).
 */
import axios from 'axios';

/**
 * @param err Erro lançado pelo axios (ou qualquer outro).
 * @returns Mensagem em português para mostrar no toast.
 */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    return (err.response.data as { message?: string })?.message ?? 'Ocorreu um erro inesperado.';
  }
  return 'Ocorreu um erro inesperado.';
}

/**
 * Converte os erros de validação do back-end (400) em { campo: mensagem },
 * para exibir a mensagem embaixo de cada campo do formulário.
 */
export function getFieldErrors(err: unknown): Record<string, string> {
  if (!axios.isAxiosError(err)) return {};
  const errors = (err.response?.data as { errors?: Array<{ field: string; message: string }> })?.errors ?? [];
  return Object.fromEntries(errors.map((e) => [e.field, e.message]));
}
