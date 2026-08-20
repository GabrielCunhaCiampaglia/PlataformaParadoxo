import { describe, expect, it } from 'vitest';
import { maximizeDamage, rollAction, rollDamage, rollPercentile, shouldMaximize } from '../src/engine.js';
import { PARADOXO_EPIFANICO_V1 as RS } from '../src/ruleset.js';
import type { RNG } from '../src/types.js';

/** RNG que força o d100 percentual a cair num valor exato. */
function forceRoll(target: number): RNG {
  const t = target === 100 ? 0 : Math.floor(target / 10);
  const u = target === 100 ? 0 : target % 10;
  const queue = [t / 10, u / 10];
  let i = 0;
  return () => queue[i++ % queue.length]!;
}

function outcomeOf(target: number, skill: number | null) {
  return rollAction(RS, { skill }, forceRoll(target)).outcome;
}

describe('rollPercentile — dois d10', () => {
  it('compõe dezenas e unidades', () => {
    const r = rollPercentile(forceRoll(47));
    expect(r.total).toBe(47);
    expect(r.dice).toEqual([
      { sides: 10, value: 40, role: 'tens' },
      { sides: 10, value: 7, role: 'units' },
    ]);
  });

  it('trata 00 + 0 como 100', () => {
    const r = rollPercentile(forceRoll(100));
    expect(r.total).toBe(100);
    expect(r.dice[0]!.value).toBe(0);
    expect(r.dice[1]!.value).toBe(0);
  });

  it('cobre 1..100 de forma uniforme, sem 0 e sem 101', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 20_000; i++) {
      const { total } = rollPercentile();
      expect(total).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThanOrEqual(100);
      seen.add(total);
    }
    expect(seen.size).toBe(100);
  });
});

describe('Rolagem de Ação — tabela confirmada em 19/08/2026', () => {
  // Perícia 50 → teto(25) = 25. Ver doc 02 §1.4.
  describe('Perícia 50', () => {
    const cases: Array<[number, string]> = [
      [1, 'extreme'],
      [2, 'good'],
      [25, 'good'],
      [26, 'normal'],
      [50, 'normal'], // R1: o valor exato da Perícia agora PASSA
      [51, 'fail'],
      [99, 'fail'],
      [100, 'disaster'],
    ];
    for (const [roll, expected] of cases) {
      it(`rolagem ${roll} → ${expected}`, () => {
        expect(outcomeOf(roll, 50)).toBe(expected);
      });
    }
  });

  // Perícia 45 (ímpar) → teto(22,5) = 23. Ver doc 02 §1.4.
  describe('Perícia 45 — arredondamento para cima', () => {
    const cases: Array<[number, string]> = [
      [23, 'good'], // no protótipo era 'normal'
      [24, 'normal'],
      [45, 'normal'], // no protótipo falhava
      [46, 'fail'],
    ];
    for (const [roll, expected] of cases) {
      it(`rolagem ${roll} → ${expected}`, () => {
        expect(outcomeOf(roll, 45)).toBe(expected);
      });
    }
  });

  it('R1: rolar exatamente a Perícia é sucesso, em toda a faixa', () => {
    for (let skill = 2; skill <= 99; skill++) {
      expect(outcomeOf(skill, skill)).not.toBe('fail');
    }
  });

  it('Perícias 1 e 2 não alcançam Sucesso Bom', () => {
    // teto(1/2) = 1 e teto(2/2) = 1; o roll 1 já foi capturado como Extremo.
    expect(outcomeOf(1, 1)).toBe('extreme');
    expect(outcomeOf(2, 2)).toBe('normal');
    expect(outcomeOf(2, 1)).toBe('fail');
    for (let roll = 2; roll <= 99; roll++) {
      expect(outcomeOf(roll, 2)).not.toBe('good');
    }
  });

  it('1 e 100 são absolutos, independem da Perícia', () => {
    for (const skill of [0, 1, 50, 99, 100, 150]) {
      expect(outcomeOf(1, skill)).toBe('extreme');
      expect(outcomeOf(100, skill)).toBe('disaster');
    }
  });

  it('Perícia >= 99 nunca falha, exceto no 100', () => {
    for (const skill of [99, 100, 120]) {
      for (let roll = 1; roll <= 99; roll++) {
        expect(outcomeOf(roll, skill)).not.toBe('fail');
      }
      expect(outcomeOf(100, skill)).toBe('disaster');
    }
  });

  it('Perícia 0 só acerta nos absolutos', () => {
    expect(outcomeOf(1, 0)).toBe('extreme');
    expect(outcomeOf(100, 0)).toBe('disaster');
    for (let roll = 2; roll <= 99; roll++) {
      expect(outcomeOf(roll, 0)).toBe('fail');
    }
  });

  it('Perícia P dá exatamente P% de chance de sucesso', () => {
    // A propriedade que torna `<=` evidentemente correto: a Perícia é literalmente
    // a porcentagem de sucesso. Ver doc 02 §1.2.
    for (const skill of [1, 25, 50, 73, 99]) {
      let successes = 0;
      for (let roll = 1; roll <= 100; roll++) {
        const o = outcomeOf(roll, skill);
        if (o === 'good' || o === 'normal' || o === 'extreme') successes++;
      }
      expect(successes).toBe(skill);
    }
  });
});

describe('Rolagem livre — sem Perícia', () => {
  it('não interpreta o resultado', () => {
    const r = rollAction(RS, { skill: null }, forceRoll(47));
    expect(r.total).toBe(47);
    expect(r.outcome).toBeNull();
    expect(r.label).toBeNull();
    expect(r.targetValue).toBeNull();
  });

  it('não interpreta nem no 1 nem no 100', () => {
    expect(rollAction(RS, {}, forceRoll(1)).outcome).toBeNull();
    expect(rollAction(RS, {}, forceRoll(100)).outcome).toBeNull();
  });

  it('omitir skill equivale a passar null', () => {
    expect(rollAction(RS, {}, forceRoll(47)).outcome).toBeNull();
  });

  it('reproduz o bug do protótipo quando onMissingSkill = fail', () => {
    const legacy = { ...RS, action: { ...RS.action, onMissingSkill: 'fail' as const } };
    expect(rollAction(legacy, {}, forceRoll(47)).outcome).toBe('fail');
    // Os absolutos continuam funcionando: não dependem da Perícia.
    expect(rollAction(legacy, {}, forceRoll(1)).outcome).toBe('extreme');
    expect(rollAction(legacy, {}, forceRoll(100)).outcome).toBe('disaster');
  });
});

describe('Validação de entrada', () => {
  it('rejeita Perícia não inteira ou negativa', () => {
    expect(() => rollAction(RS, { skill: 45.5 })).toThrow(/inteiro/);
    expect(() => rollAction(RS, { skill: -1 })).toThrow(/negativa/);
  });
});

describe('Rolagem de Dano', () => {
  it('soma N dados e registra cada um', () => {
    const r = rollDamage(RS, { sides: 6, quantity: 3 }, () => 0.5);
    expect(r.dice).toHaveLength(3);
    expect(r.total).toBe(r.dice.reduce((s, d) => s + d.value, 0));
    expect(r.expression).toBe('3d6');
  });

  it('respeita os limites do dado', () => {
    for (const sides of RS.damage.dice) {
      const r = rollDamage(RS, { sides, quantity: 40 });
      for (const d of r.dice) {
        expect(d.value).toBeGreaterThanOrEqual(1);
        expect(d.value).toBeLessThanOrEqual(sides);
      }
    }
  });

  it('aceita todo o catálogo e rejeita o que está fora dele', () => {
    expect(RS.damage.dice).toEqual([2, 3, 4, 6, 8, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(() => rollDamage(RS, { sides: 12, quantity: 1 })).toThrow(/catálogo/);
    expect(() => rollDamage(RS, { sides: 7, quantity: 1 })).toThrow(/catálogo/);
  });

  it('rejeita quantidade inválida', () => {
    expect(() => rollDamage(RS, { sides: 6, quantity: 0 })).toThrow(/maior que zero/);
    expect(() => rollDamage(RS, { sides: 6, quantity: 2.5 })).toThrow(/inteiro/);
    expect(() => rollDamage(RS, { sides: 6, quantity: 101 })).toThrow(/100/);
  });
});

describe('Crítico maximiza o dano — ficha oficial p.7', () => {
  it('Extremo maximiza sem rolar', () => {
    expect(shouldMaximize(RS, 'extreme')).toBe(true);
    // O exemplo literal da ficha: chute (1d6) no Extremo dá 6.
    const r = maximizeDamage(RS, { sides: 6, quantity: 1 });
    expect(r.total).toBe(6);
    expect(r.dice).toEqual([{ sides: 6, value: 6 }]);
  });

  it('maximiza cada dado de uma rolagem múltipla', () => {
    expect(maximizeDamage(RS, { sides: 20, quantity: 2 }).total).toBe(40);
  });

  it('as demais faixas rolam normalmente', () => {
    for (const o of ['good', 'normal', 'fail', 'disaster', null]) {
      expect(shouldMaximize(RS, o)).toBe(false);
    }
  });
});

describe('Config de dano corrigida com a ficha oficial', () => {
  it('permite modificador e dados mistos', () => {
    // "1d10 + Acessórios" e "1d6 + 1d100 Resistência" — doc 09 §9.1
    expect(RS.damage.allowModifier).toBe(true);
    expect(RS.damage.allowMixedDice).toBe(true);
  });
});
