import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { TABLE } from '../src/table.js';
import { BULB, VIEWS, projectToFrame } from '../src/viewpoints.js';

/**
 * O enquadramento é REQUISITO, não gosto.
 *
 * O pedido foi explícito: a lâmpada "mal aparece, só fica pendurada", e a cena é
 * a mesa e o que está sobre ela. Isso são afirmações verificáveis sobre onde
 * cada coisa cai no quadro — e verificar em teste vale mais do que conferir a
 * olho numa captura, porque quem mexer na altura da lâmpada ou no campo de visão
 * daqui a três meses vai saber na hora que quebrou.
 */

/** Proporções extremas que a cena precisa aguentar: celular em pé até monitor. */
const ASPECTS = [9 / 19.5, 3 / 4, 1, 16 / 9, 21 / 9];

describe('A lâmpada mal aparece', () => {
  for (const aspect of ASPECTS) {
    it(`fica dentro do quadro e encostada no topo — proporção ${aspect.toFixed(2)}`, () => {
      const p = projectToFrame(VIEWS.mesa!, BULB, aspect);

      // Dentro do quadro, senão não é "mal aparece", é "não aparece".
      expect(Math.abs(p.x), 'lâmpada saiu pela lateral').toBeLessThan(1);
      expect(p.y, 'lâmpada saiu por cima do quadro').toBeLessThan(1);

      // E no quinto superior. Se descer daqui, deixa de ser um detalhe no alto
      // e vira personagem da cena.
      expect(p.y, 'lâmpada desceu para o meio do quadro').toBeGreaterThan(0.6);
    });
  }
});

describe('A mesa preenche o quadro', () => {
  it('a borda da frente passa por baixo da tela, sem mostrar o vazio', () => {
    // Se a borda de baixo da mesa aparecesse, veríamos o nada por baixo dela e a
    // ilusão de estar sentado à mesa se desfaz.
    const frente = new THREE.Vector3(0, 0, TABLE.halfZ);
    const p = projectToFrame(VIEWS.mesa!, frente, 16 / 9);
    expect(p.y, 'a borda da frente entrou no quadro').toBeLessThan(-0.85);
  });

  it('as laterais alcançam as bordas nas telas largas', () => {
    const esquerda = new THREE.Vector3(-TABLE.halfX, 0, 0);
    const p = projectToFrame(VIEWS.mesa!, esquerda, 21 / 9);
    expect(Math.abs(p.x), 'sobrou vazio na lateral').toBeGreaterThan(0.95);
  });
});

describe('Os alvos de cada vista estão enquadrados', () => {
  it('a ficha inteira cabe na vista dela', () => {
    // O papel tem 0,62 × 0,86 e fica em x = −0,62. Os quatro cantos precisam
    // caber, senão a última coisa que se vê antes do HTML entrar é uma página
    // cortada.
    for (const dx of [-0.31, 0.31]) {
      for (const dz of [-0.43, 0.43]) {
        const canto = new THREE.Vector3(-0.62 + dx, 0.012, 0.06 + dz);
        const p = projectToFrame(VIEWS.ficha!, canto, 16 / 9);
        expect(Math.abs(p.x), `canto (${dx}, ${dz}) saiu pela lateral`).toBeLessThan(1);
        expect(Math.abs(p.y), `canto (${dx}, ${dz}) saiu por cima ou por baixo`).toBeLessThan(1);
      }
    }
  });

  it('o tapete de dados cabe na vista dele, com folga para os dados', () => {
    for (const dx of [-0.47, 0.47]) {
      for (const dz of [-0.38, 0.38]) {
        const canto = new THREE.Vector3(0.66 + dx, 0.014, dz);
        const p = projectToFrame(VIEWS.dados!, canto, 16 / 9);
        expect(Math.abs(p.x), `canto (${dx}, ${dz}) saiu pela lateral`).toBeLessThan(1);
        expect(Math.abs(p.y), `canto (${dx}, ${dz}) saiu por cima ou por baixo`).toBeLessThan(1);
      }
    }
  });

  it('a vista de dados olha de cima, como a rolagem já olha', () => {
    // A rolagem enquadra a ~78° de elevação. Se esta vista divergir muito, a
    // passagem de uma para a outra vira um salto.
    const dir = VIEWS.dados!.position.clone().sub(VIEWS.dados!.target).normalize();
    const elevacao = (Math.asin(dir.y) * 180) / Math.PI;
    expect(elevacao).toBeGreaterThan(70);
    expect(elevacao).toBeLessThan(85);
  });
});
