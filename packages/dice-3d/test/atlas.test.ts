import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildDiceGeometry } from '../src/geometry.js';
import { POLYHEDRA } from '../src/polyhedra.js';

/**
 * REGRESSÃO — mapeamento face ↔ célula do atlas.
 *
 * Este foi o bug mais caro do módulo. `CanvasTexture` usa `flipY = true`, então
 * a linha 0 do canvas é lida pela ÚLTIMA linha de V. Sem inverter a linha ao
 * calcular a UV, cada face amostrava a célula espelhada na vertical.
 *
 * O sintoma enganava: sólidos com número ÍMPAR de colunas têm uma linha central
 * invariante, então d6 e d20 acertavam de vez em quando e erravam no resto. O
 * d10 tem 4 colunas, nenhuma linha invariante, e NUNCA mostrava número. E o d4,
 * com 2×2 células todas ocupadas, mostrava sempre um número — o ERRADO, que é
 * a pior falha possível num dado.
 */
describe('Atlas — a face lê a própria célula', () => {
  /** Onde a UV cai no CANVAS, já considerando o flipY da textura. */
  function canvasCellOf(u: number, v: number, cols: number) {
    return {
      col: Math.min(cols - 1, Math.floor(u * cols + 1e-6)),
      // px.y = (1 − v)·size  →  linha do canvas
      row: Math.min(cols - 1, Math.floor((1 - v) * cols + 1e-6)),
    };
  }

  for (const [id, p] of Object.entries(POLYHEDRA)) {
    it(`${id}: cada face amostra a célula do próprio índice`, () => {
      const { geometry, cols } = buildDiceGeometry(p, 0.92);
      const uv = geometry.getAttribute('uv');

      let cursor = 0;
      for (let f = 0; f < p.faces.length; f++) {
        const verts = (p.faces[f]!.length - 2) * 3;
        const expected = { col: f % cols, row: Math.floor(f / cols) };

        for (let k = 0; k < verts; k++) {
          const got = canvasCellOf(uv.getX(cursor + k), uv.getY(cursor + k), cols);
          expect(got, `${id} face ${f}, vértice ${k}`).toEqual(expected);
        }
        cursor += verts;
      }
    });
  }

  it('o número sai DE PÉ na face que assentou', () => {
    // Sem rotação, a face de cima do d6 tem normal +Y. O eixo V da UV precisa
    // crescer na direção que a câmera lê como "para cima" — caso contrário o
    // número aparece de cabeça para baixo.
    const p = POLYHEDRA.d6!;
    const topFace = p.faces.findIndex((_, i) => {
      const c = p.faces[i]!.map((vi) => p.vertices[vi]!);
      return c.every((v) => Math.abs(v[1] - c[0]![1]) < 1e-9) && c[0]![1] > 0.5;
    });
    expect(topFace).toBeGreaterThanOrEqual(0);

    const { geometry, cols } = buildDiceGeometry(p, 0.92, {
      faceIndex: topFace,
      quaternion: new THREE.Quaternion(),
    });
    const uv = geometry.getAttribute('uv');
    const pos = geometry.getAttribute('position');

    // Entre os vértices dessa face, o de menor Z (mais longe da câmera, ou seja
    // "para cima" na tela) precisa ter o maior V.
    const start = topFace * (p.faces[topFace]!.length - 2) * 3;
    const verts = (p.faces[topFace]!.length - 2) * 3;
    let farZ = { z: Infinity, v: 0 };
    let nearZ = { z: -Infinity, v: 0 };
    for (let k = 0; k < verts; k++) {
      const z = pos.getZ(start + k);
      const v = uv.getY(start + k);
      if (z < farZ.z) farZ = { z, v };
      if (z > nearZ.z) nearZ = { z, v };
    }
    expect(farZ.v).toBeGreaterThan(nearZ.v);
    expect(cols).toBe(3);
  });
});
