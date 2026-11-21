/**
 * ai.schema.test.ts
 * Testa a validação da resposta da IA na leitura da foto: dados ruins da IA
 * nunca devem quebrar o formulário nem gravar placa inválida.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vehicleSuggestionSchema } from './ai.schema';

test('normaliza placa válida e mantém os campos', () => {
  const result = vehicleSuggestionSchema.parse({
    placa: 'abc-1d23',
    modelo: ' Fiat Argo ',
    cor: 'Prata',
    tipoVeiculo: 'CARRO',
    avarias: null,
  });
  assert.deepEqual(result, { placa: 'ABC1D23', modelo: 'Fiat Argo', cor: 'Prata', tipoVeiculo: 'CARRO', avarias: null });
});

test('placa inválida, tipo desconhecido e campos vazios viram null', () => {
  const result = vehicleSuggestionSchema.parse({ placa: 'XX12', modelo: '', cor: undefined, tipoVeiculo: 'CAMINHAO' });
  assert.deepEqual(result, { placa: null, modelo: null, cor: null, tipoVeiculo: null, avarias: null });
});

test('texto longo demais é cortado em vez de reprovar a resposta', () => {
  const result = vehicleSuggestionSchema.parse({ placa: null, modelo: 'x'.repeat(80), cor: null, tipoVeiculo: 'MOTO', avarias: null });
  assert.equal(result.modelo?.length, 50);
  assert.equal(result.tipoVeiculo, 'MOTO');
});

test('resposta que não é objeto é rejeitada', () => {
  assert.throws(() => vehicleSuggestionSchema.parse('texto livre'));
});
