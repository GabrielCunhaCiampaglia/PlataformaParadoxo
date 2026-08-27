import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { TABLE } from '../src/table.js';
import {
  BULB,
  SIZES,
  SPOTS,
  VIEWS,
  cornersOf,
  layoutFor,
  projectToFrame,
  resolveView,
  type Layout,
} from '../src/viewpoints.js';

/**
 * O enquadramento é REQUISITO, não gosto.
 *
 * A primeira versão deste arquivo só checava a tela larga, e por isso deixou
 * passar o defeito que o cliente encontrou no celular: em pé, ficha e tapete
 * ficavam cortados nas laterais. Conferir a olho numa captura de desktop nunca
 * ia pegar isso. Agora toda afirmação roda nas DUAS disposições, em proporções
 * de celular em pé até monitor ultralargo.
 */

const TELAS: Array<[string, number]> = [
  ['celular em pé', 9 / 19.5],
  ['celular em pé, curto', 9 / 16],
  ['tablet em pé', 3 / 4],
  ['quadrado', 1],
  ['paisagem', 16 / 9],
  ['ultralarga', 21 / 9],
];

function dentro(p: THREE.Vector2, folga = 1): boolean {
  return Math.abs(p.x) <= folga && Math.abs(p.y) <= folga;
}

describe('Nada é cortado na vista da mesa', () => {
  for (const [nome, aspect] of TELAS) {
    it(`${nome} (${aspect.toFixed(2)}): ficha e tapete cabem inteiros`, () => {
      const layout: Layout = layoutFor(aspect);
      const view = resolveView(layout, 'mesa', aspect);

      for (const [alvo, size] of [
        ['ficha', SIZES.ficha],
        ['dados', SIZES.dados],
      ] as const) {
        for (const canto of cornersOf(SPOTS[layout][alvo], size, 0.014)) {
          const p = projectToFrame(view, canto, aspect);
          expect(
            dentro(p),
            `${alvo} cortado em ${nome}: canto caiu em (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`,
          ).toBe(true);
        }
      }
    });
  }
});

describe('A lâmpada mal aparece', () => {
  for (const [nome, aspect] of TELAS) {
    it(`${nome}: no quadro, e encostada no topo`, () => {
      const layout = layoutFor(aspect);
      const p = projectToFrame(resolveView(layout, 'mesa', aspect), BULB, aspect);

      expect(Math.abs(p.x), 'lâmpada saiu pela lateral').toBeLessThan(1);
      expect(p.y, 'lâmpada saiu por cima do quadro').toBeLessThan(1);
      // No terço superior. Abaixo disso ela deixa de ser um detalhe no alto e
      // vira personagem da cena.
      expect(p.y, 'lâmpada desceu demais').toBeGreaterThan(0.45);
    });
  }
});

describe('A mesa preenche o quadro', () => {
  for (const [nome, aspect] of TELAS) {
    it(`${nome}: nenhuma borda do tampo aparece`, () => {
      const layout = layoutFor(aspect);
      const view = resolveView(layout, 'mesa', aspect);

      // Se a borda da frente entrasse no quadro, veríamos o vazio por baixo e a
      // sensação de estar SENTADO à mesa se desfaria.
      const frente = projectToFrame(view, new THREE.Vector3(0, 0, TABLE.halfZ), aspect);
      expect(frente.y, 'a borda da frente entrou no quadro').toBeLessThan(-0.9);

      for (const sx of [-1, 1]) {
        const lado = projectToFrame(view, new THREE.Vector3(sx * TABLE.halfX, 0, 0), aspect);
        expect(Math.abs(lado.x), 'sobrou vazio na lateral').toBeGreaterThan(0.95);
      }
    });
  }
});

describe('As vistas de perto enquadram o alvo inteiro', () => {
  for (const [nome, aspect] of TELAS) {
    for (const alvo of ['ficha', 'dados'] as const) {
      it(`${nome}: a vista de ${alvo} cabe`, () => {
        const layout = layoutFor(aspect);
        const view = resolveView(layout, alvo, aspect);
        for (const canto of cornersOf(SPOTS[layout][alvo], SIZES[alvo], 0.014)) {
          const p = projectToFrame(view, canto, aspect);
          expect(dentro(p), `${alvo} cortado em ${nome}`).toBe(true);
        }
      });
    }
  }
});

describe('A vista de dados olha de cima, como a rolagem já olha', () => {
  for (const layout of ['wide', 'tall'] as const) {
    it(`${layout}: elevação entre 70° e 85°`, () => {
      // A rolagem enquadra a ~78° de elevação. Divergir muito daqui faria a
      // passagem de uma vista para a outra virar um salto.
      const v = VIEWS[layout].dados;
      const dir = v.position.clone().sub(v.target).normalize();
      const elevacao = (Math.asin(dir.y) * 180) / Math.PI;
      expect(elevacao).toBeGreaterThan(70);
      expect(elevacao).toBeLessThan(85);
    });
  }
});
