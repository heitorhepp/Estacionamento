/**
 * tariff.test.ts
 * Testes da função de cálculo de tarifa (rode com: npm test).
 * Usa o test runner nativo do Node, sem dependências extras.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFee, toCents } from './tariff';

// Tolerância 15 min, 1ª hora R$ 10, adicional R$ 5, diária R$ 50.
const prices = { toleranceMinutes: 15, firstHourCents: 1000, additionalHourCents: 500, dailyCents: 5000 };

const cases: Array<[label: string, minutes: number, expectedCents: number]> = [
  ['0 min', 0, 0],
  ['exatamente na tolerância', 15, 0],
  ['1 min acima da tolerância', 16, 1000],
  ['exatamente 1h', 60, 1000],
  ['1h01 cobra 2 horas', 61, 1500],
  ['3h', 180, 2000],
  ['20h atinge o teto da diária', 20 * 60, 5000],
  ['exatamente 24h = 1 diária', 24 * 60, 5000],
  ['24h05 = 1 diária + 1 hora', 24 * 60 + 5, 6000],
  ['26h30 = 1 diária + 3 horas', 26 * 60 + 30, 7000],
  ['47h = 2 diárias (restante limitado à diária)', 47 * 60, 10000],
  ['3 dias exatos', 3 * 24 * 60, 15000],
];

for (const [label, minutes, expected] of cases) {
  test(label, () => assert.equal(calculateFee(minutes, prices), expected));
}

test('toCents arredonda corretamente', () => {
  assert.equal(toCents('12.50'), 1250);
  assert.equal(toCents(0.1 + 0.2), 30);
});
