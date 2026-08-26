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

  it('a orientação do número acompanha a face, não o mundo', () => {
    // O eixo U da UV precisa ser paralelo a uma ARESTA da face. Se ele vier de
    // um vetor auxiliar do mundo, o número sai em ângulo aleatório em relação
    // à face e parece torto mesmo com o dado assentado direito.
    const p = POLYHEDRA.d6!;
    const { geometry } = buildDiceGeometry(p, 1);
    const uv = geometry.getAttribute('uv');
    const pos = geometry.getAttribute('position');

    for (let f = 0; f < p.faces.length; f++) {
      const start = f * (p.faces[f]!.length - 2) * 3;
      // Vértices 0 e 1 do leque são as pontas da primeira aresta da face.
      const du = uv.getX(start + 1) - uv.getX(start);
      const dv = uv.getY(start + 1) - uv.getY(start);
      // Paralelo ao eixo U: a componente V da aresta é praticamente nula.
      expect(Math.abs(dv), `face ${f} com aresta fora do eixo U`).toBeLessThan(
        Math.abs(du) * 0.02,
      );
      expect(pos.count).toBeGreaterThan(0);
    }
  });
});
