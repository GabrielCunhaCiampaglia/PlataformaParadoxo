import { PARADOXO_EPIFANICO_V1 as RULESET, rollAction } from '@paradoxo/rules';
import { describe, expect, it } from 'vitest';
import {
  faceValuesFor,
  joinPercentile,
  labelFaces,
  readTopValue,
  splitPercentile,
} from '../src/label.js';
import * as CANNON from 'cannon-es';
import { POLYHEDRA, faceNormal, validate } from '../src/polyhedra.js';
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
    // O que importa é o `toBe` acima: nenhuma leitura pode divergir do motor.
    //
    // Este piso só garante que a amostra é grande. Ele desceu de 290 quando o
    // portão de aceitação passou a exigir LEGIBILIDADE e não só repouso — uma
    // simulação a mais é descartada aqui e ali, e o renderer simplesmente tenta
    // de novo. Uma queda brusca daqui, porém, é sinal de que o portão apertou
    // demais e vale investigar.
    expect(checked).toBeGreaterThan(280);
  });
});

/**
 * TODOS os sólidos, não só o d10 do teste de fogo.
 *
 * O d6 saía deitado na aresta em cerca de 5% das rolagens e ninguém percebia,
 * porque a única cobertura de assentamento era sobre o par de d10 do percentual.
 */
describe('Legibilidade — sólido por sólido', () => {
  const VIEW = [0, 0.978, 0.208] as const;

  function readAngle(dieId: string, q: CANNON.Quaternion): number {
    const p = POLYHEDRA[dieId]!;
    const v = new CANNON.Vec3();
    const len = Math.hypot(VIEW[0], VIEW[1], VIEW[2]);
    // No d4 o resultado é lido num VÉRTICE; nos demais, numa face.
    const dirs =
      dieId === 'd4'
        ? p.vertices.map((x) => [...x] as [number, number, number])
        : p.faces.map((_, i) => [...faceNormal(p, i)] as [number, number, number]);

    let best = -Infinity;
    for (const d of dirs) {
      v.set(d[0], d[1], d[2]);
      q.vmult(v, v);
      best = Math.max(best, (v.x * VIEW[0] + v.y * VIEW[1] + v.z * VIEW[2]) / len);
    }
    return best;
  }

  for (const id of ['d4', 'd6', 'd8', 'd10', 'd20']) {
    it(`${id}: toda rolagem aceita assenta de frente para a câmera`, () => {
      let accepted = 0;
      for (let i = 0; i < 150; i++) {
        const sim = simulate({ dice: [id], seed: 610_000 + i, viewDir: VIEW, record: true });
        if (!sim.ok) continue;
        accepted++;

        const t = sim.frames[0]!;
        const o = (t.steps - 1) * 7;
        const q = new CANNON.Quaternion(
          t.data[o + 3]!,
          t.data[o + 4]!,
          t.data[o + 5]!,
          t.data[o + 6]!,
        );

        // 0,9 fica bem acima do cubo apoiado na aresta, que dá 0,707 — o caso
        // exato que o limiar antigo de −0,7 deixava passar.
        expect(readAngle(id, q), `${id} semente ${610_000 + i} saiu ilegível`).toBeGreaterThan(0.9);
      }
      // A cutucada in-loop deve deixar a rejeição rara em rolagem de um dado.
      expect(accepted, `${id} rejeitou demais`).toBeGreaterThan(135);
    }, 60_000);
  }

  it('o d4 é lido no vértice do topo, e todo valor cabe nos 4 vértices', () => {
    // labelFaces é reaproveitado por vértice: são 4 vértices e 4 valores.
    for (let target = 1; target <= 4; target++) {
      const labels = labelFaces({ dieId: 'd4', topFaceIndex: 2, targetValue: target });
      expect(labels).toHaveLength(4);
      expect(readTopValue(labels, 2)).toBe(target);
      expect([...labels].sort()).toEqual([1, 2, 3, 4]);
    }
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

  it('grava a trajetória quando pedido, para reprodução posterior', () => {
    const r = simulate({ dice: ['d6'], seed: 77, record: true });
    expect(r.ok).toBe(true);

    const track = r.frames[0]!;
    expect(track.steps).toBe(r.steps);
    // 7 floats por passo: posição (3) + quaternion (4).
    expect(track.data.length).toBe(r.steps * 7);
    expect(track.data).toBeInstanceOf(Float32Array);

    // O quaternion gravado precisa ser unitário, senão a rotação distorce a malha.
    const q = track.data.subarray(3, 7);
    expect(Math.hypot(q[0]!, q[1]!, q[2]!, q[3]!)).toBeCloseTo(1, 4);
  });

  it('não aloca gravação quando record está desligado', () => {
    expect(simulate({ dice: ['d6'], seed: 77 }).frames).toEqual([]);
  });

  it('rejeita geometria desconhecida', () => {
    expect(simulate({ dice: ['d12'], seed: 1 }).degeneracy).toBe('exception');
  });
});
