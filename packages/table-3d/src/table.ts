import { POLYHEDRA, buildDiceGeometry, circumradius } from '@paradoxo/dice-3d';
import * as THREE from 'three';
import { applyPS1 } from './ps1.js';
import { matTexture, metalTexture, paperTexture, woodTexture } from './textures.js';
import { BULB, SPOTS, type Layout } from './viewpoints.js';

/**
 * A mesa e o que está sobre ela.
 *
 * A cena inteira é: tampo de madeira, uma lâmpada pendurada que mal entra no
 * quadro, e o que a luz dela alcança. Não há parede, não há chão, não há
 * ambiente. O que estiver fora do alcance da lâmpada é preto — e isso não é
 * limitação, é o assunto da cena.
 */

/** Meia-largura e meia-profundidade do tampo, em unidades de mundo. */
export const TABLE = { halfX: 2.9, halfZ: 1.75, thickness: 0.08 };

/** Regiões clicáveis. O `name` do objeto é o que o raycast devolve. */
export type Hotspot = 'ficha' | 'dados';

export interface TableParts {
  root: THREE.Group;
  /** Malhas que respondem a clique, por hotspot. */
  pickable: Map<Hotspot, THREE.Object3D>;
  lamp: THREE.PointLight;
  bulb: THREE.Mesh;
  /** Dados em repouso sobre o tapete — a última rolagem que ficou na mesa. */
  dice: THREE.Group;
  /**
   * Reposiciona o que está sobre a mesa para a disposição pedida.
   *
   * Em tela larga, ficha e tapete ficam lado a lado; num celular em pé, um atrás
   * do outro. Ver `viewpoints.ts` para o porquê.
   */
  setLayout(layout: Layout): void;
  dispose(): void;
}

/** Mancha escura sob um objeto, no lugar de sombra calculada. */
function contactShadow(w: number, h: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    // Não recebe luz: é uma mancha pintada, não um cálculo de sombra. Um shadow
    // map de 1024² por quadro seria o item mais caro da cena inteira, para um
    // ganho que a esta resolução ninguém distingue de um borrão escuro.
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}

function lambert(map: THREE.Texture): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ map });
  applyPS1(m);
  return m;
}

export function buildTable(): TableParts {
  const root = new THREE.Group();
  const pickable = new Map<Hotspot, THREE.Object3D>();
  const disposables: Array<{ dispose(): void }> = [];

  const track = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  // --- tampo ---
  //
  // Segmentado de propósito. O jitter de vértice do PS1 acontece POR VÉRTICE:
  // num tampo de 8 vértices ele quase não aparece. Algumas dezenas bastam para
  // a superfície tremer na medida certa quando a câmera anda.
  const wood = track(woodTexture());
  const topGeo = track(
    new THREE.BoxGeometry(TABLE.halfX * 2, TABLE.thickness, TABLE.halfZ * 2, 10, 1, 6),
  );
  const topMat = track(lambert(wood));
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = -TABLE.thickness / 2;
  root.add(top);

  // Saia da mesa: dá espessura à silhueta na borda da frente, que é a única
  // parte da estrutura que a luz ainda alcança.
  const apronGeo = track(new THREE.BoxGeometry(TABLE.halfX * 2 - 0.12, 0.14, TABLE.halfZ * 2 - 0.12));
  const apron = new THREE.Mesh(apronGeo, topMat);
  apron.position.y = -TABLE.thickness - 0.07;
  root.add(apron);

  // --- lâmpada ---
  const metal = track(metalTexture());

  // O fio sobe e sai do quadro. Não há teto: ele simplesmente some no preto,
  // que é mais inquietante do que mostrar de onde vem.
  const cordGeo = track(new THREE.CylinderGeometry(0.006, 0.006, 2.4, 4, 1));
  const cordMat = track(new THREE.MeshBasicMaterial({ color: 0x0d0d10 }));
  const cord = new THREE.Mesh(cordGeo, cordMat);
  cord.position.set(BULB.x, BULB.y + 1.2, BULB.z);
  root.add(cord);

  const socketGeo = track(new THREE.CylinderGeometry(0.032, 0.042, 0.09, 6, 1));
  const socketMat = track(lambert(metal));
  const socket = new THREE.Mesh(socketGeo, socketMat);
  socket.position.set(BULB.x, BULB.y + 0.082, BULB.z);
  root.add(socket);

  // O bulbo não é iluminado, ele É a luz: material básico, sempre no máximo.
  const bulbGeo = track(new THREE.SphereGeometry(0.042, 7, 5));
  const bulbMat = track(new THREE.MeshBasicMaterial({ color: 0xffe6bd }));
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.copy(BULB);
  root.add(bulb);

  // Uma luz só, com queda física. O `distance` é o que faz a borda da mesa cair
  // no preto sem precisar de neblina nem de gradiente pintado.
  const lamp = new THREE.PointLight(0xffc07a, 13, 4.6, 2);
  lamp.position.copy(BULB);
  root.add(lamp);

  // --- ficha ---
  const paper = track(paperTexture());
  const paperGeo = track(new THREE.PlaneGeometry(0.62, 0.86, 3, 4));
  const paperMat = track(lambert(paper));
  const sheet = new THREE.Mesh(paperGeo, paperMat);
  sheet.rotation.x = -Math.PI / 2;
  // Levemente torta: papel largado na mesa não fica alinhado com a borda.
  sheet.rotation.z = 0.08;
  sheet.position.y = 0.012;
  sheet.name = 'ficha';
  root.add(sheet);
  pickable.set('ficha', sheet);

  const paperShadow = contactShadow(0.78, 1.0);
  paperShadow.position.y = 0.004;
  root.add(paperShadow);

  // --- tapete de dados ---
  //
  // Ele resolve um problema de física, não de decoração: a simulação sempre teve
  // paredes invisíveis para os dados não escaparem, e numa mesa lisa isso seria
  // mágica visível. Com o tapete e o friso, a parede tem de onde sair.
  const mat = track(matTexture());
  const matGeo = track(new THREE.BoxGeometry(0.94, 0.012, 0.76, 4, 1, 3));
  const matMat = track(lambert(mat));
  const diceMat = new THREE.Mesh(matGeo, matMat);
  diceMat.position.y = 0.014;
  diceMat.name = 'dados';
  root.add(diceMat);
  pickable.set('dados', diceMat);

  const matShadow = contactShadow(1.15, 0.98);
  matShadow.position.y = 0.004;
  root.add(matShadow);

  // --- dados em repouso ---
  //
  // A última rolagem fica na mesa. Aqui eles entram parados, só para o tapete
  // não estar vazio; quando a rolagem for ligada à cena, são estes mesmos
  // objetos que a simulação passa a mover.
  const dice = new THREE.Group();
  const diceMaterial = track(new THREE.MeshLambertMaterial({ color: 0x5b4a8c }));
  applyPS1(diceMaterial);

  // Posições e rotações FIXAS, não sorteadas: a mesa precisa ser a mesma a cada
  // carregamento, senão o jogador vê os dados pularem de lugar ao voltar.
  const resting: Array<[string, number, number, number, number]> = [
    // id, x, z, giro, inclinação
    ['d20', -0.16, -0.17, 0.9, 0.05],
    ['d6', 0.13, 0.11, 0.32, 0.0],
    ['d10', -0.05, 0.21, 2.1, 0.03],
  ];

  for (const [id, x, z, spin, tilt] of resting) {
    const poly = POLYHEDRA[id];
    if (!poly) continue;
    const { geometry } = buildDiceGeometry(poly);
    track(geometry);
    const radius = circumradius(poly);
    const scale = 0.075 / radius;
    const mesh = new THREE.Mesh(geometry, diceMaterial);
    mesh.scale.setScalar(scale);
    // Assentados SOBRE o tapete, não flutuando acima dele.
    mesh.position.set(x, 0.02 + radius * scale * 0.62, z);
    mesh.rotation.set(tilt, spin, tilt * 0.5);
    dice.add(mesh);
  }
  root.add(dice);

  return {
    root,
    pickable,
    lamp,
    bulb,
    dice,
    setLayout(layout: Layout) {
      const f = SPOTS[layout].ficha;
      const d = SPOTS[layout].dados;
      sheet.position.x = f.x;
      sheet.position.z = f.y;
      paperShadow.position.x = f.x;
      paperShadow.position.z = f.y + 0.02;
      diceMat.position.x = d.x;
      diceMat.position.z = d.y;
      matShadow.position.x = d.x;
      matShadow.position.z = d.y + 0.02;
      // O grupo carrega os dados junto com o tapete: eles ficam em coordenadas
      // do tapete, não do mundo, e por isso não escorregam ao trocar a
      // disposição.
      dice.position.set(d.x, 0, d.y);
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
