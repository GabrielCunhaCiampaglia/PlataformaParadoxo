import { PARADOXO_EPIFANICO_V1 as RULESET, rollAction } from '@paradoxo/rules';
import { describe, expect, it } from 'vitest';
import {
  faceValuesFor,
  joinPercentile,
  labelFaces,
  readTopValue,
  splitPercentile,
} from '../src/label.js';
import { POLYHEDRA, validate } from '../src/polyhedra.js';
import { mulberry32, simulate } from '../src/simulate.js';

describe('Geometrias — requisitos do cannon-es', () => {
  for (const [id, p] of Object.entries(POLYHEDRA)) {
    it(`${id} é válido: faces planares, nenhuma coplanar`, () => {
      expect(validate(p)).toEqual([]);
      expect(p.faces).toHaveLength(p.faceCount);
    });
  }

  it('o d10 é um trapezoedro pentagonal com kites planares', () => {
    const d10 = POLYHEDRA.d10!;
    expect(d10.vertices).toHaveLength(12);
    expect(d10.faces).toHaveLength(10);
    for (const f of d10.faces) expect(f).toHaveLength(4);
  });
});

describe('Percentual — decomposição do d100', () => {
  it('separa e recompõe todo valor de 1 a 100', () => {
    for (let n = 1; n <= 100; n++) {
      const { tens, units } = splitPercentile(n);
      expect(joinPercentile(tens, units)).toBe(n);
    }
  });

  it('trata 00 + 0 como 100, a convenção de mesa', () => {
    expect(splitPercentile(100)).toEqual({ tens: 0, units: 0 });
    expect(joinPercentile(0, 0)).toBe(100);
  });

  it('separa 47 em 40 e 7', () => {
    expect(splitPercentile(47)).toEqual({ tens: 40, units: 7 });
  });

  it('rejeita valores fora do d100', () => {
    expect(() => splitPercentile(0)).toThrow();
    expect(() => splitPercentile(101)).toThrow();
  });
});

describe('Rotulagem pós-simulação', () => {
  it('põe o valor do motor na face que assentou', () => {
    for (let face = 0; face < 10; face++) {
      const labels = labelFaces({ dieId: 'd10', topFaceIndex: face, targetValue: 7, role: 'units' });
      expect(readTopValue(labels, face)).toBe(7);
    }
  });

  it('usa cada valor do dado exatamente uma vez', () => {
    for (const [id, role] of [
      ['d4', undefined],
      ['d6', undefined],
      ['d8', undefined],
      ['d20', undefined],
      ['d10', 'tens'],
      ['d10', 'units'],
    ] as const) {
      const values = faceValuesFor(id, role);
      const labels = labelFaces({
        dieId: id,
        topFaceIndex: 2,
        targetValue: values[0]!,
        ...(role ? { role } : {}),
        rng: mulberry32(42),
      });
      expect([...labels].sort((a, b) => a - b)).toEqual([...values].sort((a, b) => a - b));
    }
  });

  it('rejeita valor que não existe no dado', () => {
    expect(() => labelFaces({ dieId: 'd6', topFaceIndex: 0, targetValue: 7 })).toThrow(/não existe/);
    expect(() =>
      labelFaces({ dieId: 'd10', topFaceIndex: 0, targetValue: 5, role: 'tens' }),
    ).toThrow(/não existe/);
  });

  it('rejeita face fora do intervalo', () => {
    expect(() => labelFaces({ dieId: 'd6', topFaceIndex: 9, targetValue: 1 })).toThrow(/fora do/);
  });
});

/**
 * O TESTE DE FOGO do doc 08 §4, Dia 2.
 *
 * Zero tolerância: o que o jogador lê na face precisa ser exatamente o que o
 * motor de regras decidiu. É a restrição do ADR-0006.
 */
describe('Teste de fogo — leitura visual bate com o motor', () => {
  function rollAndLabel(seed: number, forced?: number) {
    const rng = mulberry32(seed);
    const action = forced
      ? { total: forced }
      : rollAction(RULESET, { skill: 50 }, mulberry32(seed * 7919));

    const { tens, units } = splitPercentile(action.total);
    const sim = simulate({ dice: ['d10', 'd10'], seed });
    if (!sim.ok) return null;

    const tensLabels = labelFaces({
      dieId: 'd10',
      topFaceIndex: sim.topFaces[0]!,
      targetValue: tens,
      role: 'tens',
      rng,
    });
    const unitsLabels = labelFaces({
      dieId: 'd10',
      topFaceIndex: sim.topFaces[1]!,
      targetValue: units,
      role: 'units',
      rng,
    });

    const read = joinPercentile(
      readTopValue(tensLabels, sim.topFaces[0]!),
      readTopValue(unitsLabels, sim.topFaces[1]!),
    );
    return { expected: action.total, read };
  }

  for (const forced of [1, 50, 100]) {
    it(`100 rolagens forçadas a ${forced} leem ${forced} em 100 de 100`, () => {
      let checked = 0;
      for (let i = 0; i < 100; i++) {
        const r = rollAndLabel(500_000 + i, forced);
        if (!r) continue;
        expect(r.read).toBe(forced);
        checked++;
      }
      expect(checked).toBeGreaterThan(95);
    });
  }

  it('300 rolagens reais do motor leem o valor certo, sempre', () => {
    let checked = 0;
    for (let i = 0; i < 300; i++) {
      const r = rollAndLabel(700_000 + i);
      if (!r) continue;
      expect(r.read).toBe(r.expected);
      checked++;
    }
    expect(checked).toBeGreaterThan(290);
  });
});

describe('Simulação headless', () => {
  it('é reprodutível com a mesma semente', () => {
    const a = simulate({ dice: ['d10', 'd10'], seed: 12345 });
    const b = simulate({ dice: ['d10', 'd10'], seed: 12345 });
    expect(a.topFaces).toEqual(b.topFaces);
    expect(a.steps).toBe(b.steps);
  });

  it('sementes diferentes dão trajetórias diferentes', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const r = simulate({ dice: ['d10', 'd10'], seed: 4000 + i });
      if (r.ok) seen.add(r.topFaces.join(','));
    }
    expect(seen.size).toBeGreaterThan(15);
  });

  it('grava os frames quando pedido, para reprodução posterior', () => {
    const r = simulate({ dice: ['d6'], seed: 77, record: true });
    expect(r.ok).toBe(true);
    expect(r.frames[0]!.length).toBe(r.steps);
    const f = r.frames[0]![0]!;
    expect(f.p).toHaveLength(3);
    expect(f.q).toHaveLength(4);
  });

  it('rejeita geometria desconhecida', () => {
    expect(simulate({ dice: ['d12'], seed: 1 }).degeneracy).toBe('exception');
  });
});
