/**
 * plate.ts
 * Normalização e validação de placas (regra 3).
 * Aceita o padrão antigo (ABC-1234) e o Mercosul (ABC1D23).
 * No banco a placa fica SEMPRE maiúscula e sem hífen, para que "abc-1234" e
 * "ABC1234" sejam reconhecidos como a mesma placa.
 */

/**
 * 3 letras + 1 número + (letra OU número) + 2 números.
 * - Antigo:   ABC 1 2 34  → a 5ª posição é número.
 * - Mercosul: ABC 1 D 23  → a 5ª posição é letra.
 */
const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

/**
 * Deixa a placa em maiúsculas e remove hífen, espaços e outros símbolos.
 * @param raw Placa como digitada (ex.: "abc-1234").
 * @returns Placa normalizada (ex.: "ABC1234").
 */
export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Verifica se uma placa JÁ NORMALIZADA está em um dos formatos aceitos.
 * @param plate Placa normalizada.
 * @returns true se válida.
 */
export function isValidPlate(plate: string): boolean {
  return PLATE_REGEX.test(plate);
}
