import { describe, expect, it } from 'vitest';
import { ExpressionError, evaluate, evaluateCondition } from '../src/expression.js';

describe('Aritmética e precedência', () => {
  it('avalia expressões básicas', () => {
    expect(evaluate('1 + 2 * 3')).toBe(7);
    expect(evaluate('(1 + 2) * 3')).toBe(9);
    expect(evaluate('10 / 4')).toBe(2.5);
    expect(evaluate('10 % 3')).toBe(1);
    expect(evaluate('-5 + 2')).toBe(-3);
    expect(evaluate('3.5 * 2')).toBe(7);
  });

  it('resolve variáveis do contexto', () => {
    expect(evaluate('roll + skill', { roll: 10, skill: 5 })).toBe(15);
  });

  it('aplica as funções da allowlist', () => {
    expect(evaluate('ceil(22.5)')).toBe(23);
    expect(evaluate('floor(22.5)')).toBe(22);
    expect(evaluate('round(22.5)')).toBe(23);
    expect(evaluate('abs(0 - 7)')).toBe(7);
    expect(evaluate('min(3, 9, 1)')).toBe(1);
    expect(evaluate('max(3, 9, 1)')).toBe(9);
  });

  it('avalia a condição real do ruleset', () => {
    expect(evaluateCondition('roll <= ceil(skill / 2)', { roll: 23, skill: 45 })).toBe(true);
    expect(evaluateCondition('roll <= ceil(skill / 2)', { roll: 24, skill: 45 })).toBe(false);
    expect(evaluateCondition('roll <= skill', { roll: 50, skill: 50 })).toBe(true);
    expect(evaluateCondition('true')).toBe(true);
  });

  it('trata comparações e lógicos', () => {
    expect(evaluate('3 < 5 && 5 <= 5')).toBe(true);
    expect(evaluate('3 > 5 || 1 == 1')).toBe(true);
    expect(evaluate('!(3 > 5)')).toBe(true);
    expect(evaluate('2 != 3')).toBe(true);
  });
});

describe('Segurança — ADR-0006 proíbe eval', () => {
  const hostile = [
    'process.exit(1)',
    'globalThis',
    'constructor',
    'this',
    '(function(){})()',
    'roll.constructor',
    'roll["x"]',
    'import("fs")',
    'require("fs")',
    'skill = 100',
    'alert(1)',
    'window',
    '__proto__',
    'Math.random()',
    'eval("1")',
    '`${roll}`',
    'roll; skill',
  ];

  for (const src of hostile) {
    it(`rejeita ${JSON.stringify(src)}`, () => {
      expect(() => evaluate(src, { roll: 1, skill: 1 })).toThrow(ExpressionError);
    });
  }

  it('rejeita identificador desconhecido em vez de tratar como undefined', () => {
    expect(() => evaluate('desconhecido + 1')).toThrow(/desconhecida/);
  });

  it('rejeita função fora da allowlist', () => {
    expect(() => evaluate('parseInt(1)')).toThrow(/desconhecida/);
  });

  it('rejeita aridade errada', () => {
    expect(() => evaluate('ceil(1, 2)')).toThrow(/argumento/);
    expect(() => evaluate('min()')).toThrow(/ao menos 1/);
  });

  it('rejeita divisão por zero em vez de devolver Infinity', () => {
    expect(() => evaluate('1 / 0')).toThrow(/zero/);
    expect(() => evaluate('1 % 0')).toThrow(/zero/);
  });

  it('rejeita expressão longa demais', () => {
    expect(() => evaluate('1 +'.repeat(200) + '1')).toThrow(/longa/);
  });

  it('rejeita variável sem valor em vez de propagar NaN silencioso', () => {
    expect(() => evaluate('skill + 1', { skill: null })).toThrow(/não tem valor/);
  });

  it('rejeita parênteses desbalanceados', () => {
    expect(() => evaluate('(1 + 2')).toThrow(ExpressionError);
    expect(() => evaluate('1 + 2)')).toThrow(ExpressionError);
  });
});
