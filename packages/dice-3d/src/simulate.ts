import * as CANNON from 'cannon-es';
import { POLYHEDRA, faceNormal, type Polyhedron } from './polyhedra.js';

/**
 * Simulação HEADLESS de uma rolagem. Não desenha nada.
 *
 * A saída é uma GRAVAÇÃO: posição e rotação de cada dado por frame, mais a face
 * que ficou para cima. É isso que permite a rotulagem pós-simulação do ADR-0010
 * — lemos a face que assentou e só então atribuímos o número, antes do primeiro
 * pixel. E permite descartar simulações degeneradas sem o jogador ver.
 */

export type Degeneracy = 'no-rest' | 'out-of-tray' | 'below-floor' | 'exception';

/**
 * Gravação de UM dado, empacotada em Float32Array.
 *
 * São 7 floats por passo — posição (3) e quaternion (4) — num único buffer
 * contíguo. A versão anterior criava um objeto com dois arrays por dado por
 * passo: numa rolagem de 10 dados com 270 passos isso são 2.700 objetos e 5.400
 * arrays, e o custo de alocação e de GC dominava o tempo total no navegador
 * (250-620 ms, contra 13-54 ms do mesmo código em Node sem gravação).
 */
export interface DieTrack {
  /** `steps × 7` floats: x, y, z, qx, qy, qz, qw. */
  data: Float32Array;
  steps: number;
}

/** Lê um passo da gravação para dentro de objetos three.js, sem alocar. */
export function readTrack(
  track: DieTrack,
  step: number,
  outPos: { set(x: number, y: number, z: number): unknown },
  outQuat: { set(x: number, y: number, z: number, w: number): unknown },
): void {
  const i = Math.min(Math.max(step, 0), track.steps - 1) * 7;
  const d = track.data;
  outPos.set(d[i]!, d[i + 1]!, d[i + 2]!);
  outQuat.set(d[i + 3]!, d[i + 4]!, d[i + 5]!, d[i + 6]!);
}

export interface SimResult {
  ok: boolean;
  degeneracy?: Degeneracy;
  /** Passos de física até o repouso. */
  steps: number;
  cpuMs: number;
  /** Uma gravação por dado. */
  frames: DieTrack[];
  /** Índice da face voltada para cima, por dado. */
  topFaces: number[];
}

export interface SimOptions {
  /** Ids do catálogo: ['d10', 'd10'] para o d100 percentual. */
  dice: string[];
  seed: number;
  maxSteps?: number;
  /** Gravar os frames custa memória; o benchmark desliga. */
  record?: boolean;
  /** Direção da cena para o observador, usada ao escolher a face lida. */
  viewDir?: readonly [number, number, number];
}

/** PRNG semeado — reprodutibilidade nos testes e no benchmark. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TRAY_WALL_H = 5;
const STEP = 1 / 60;
const REST_FRAMES = 6;
const REST_LINEAR = 0.19;
const REST_ANGULAR = 0.26;

/**
 * O tray cresce com a quantidade de dados.
 *
 * Mantido JUSTO de propósito: cada unidade a mais de tray é distância que os
 * dados percorrem e passos de física que a simulação paga. Inflar o tray para
 * melhorar o enquadramento levou o custo de 12 ms para 88 ms numa rolagem de
 * d100. O enquadramento é problema da CÂMERA, que afasta de graça.
 */
export function trayHalfFor(count: number): number {
  return Math.max(2.2, 1.15 * Math.sqrt(count) + 0.8);
}

function toShape(p: Polyhedron): CANNON.ConvexPolyhedron {
  return new CANNON.ConvexPolyhedron({
    vertices: p.vertices.map((v) => new CANNON.Vec3(v[0], v[1], v[2])),
    faces: p.faces.map((f) => [...f]),
  });
}

/** Cache: construir ConvexPolyhedron é caro e a forma não muda. */
const shapeCache = new Map<string, CANNON.ConvexPolyhedron>();
function shapeFor(id: string): CANNON.ConvexPolyhedron {
  let s = shapeCache.get(id);
  if (!s) {
    const p = POLYHEDRA[id];
    if (!p) throw new Error(`Geometria desconhecida: ${id}`);
    s = toShape(p);
    shapeCache.set(id, s);
  }
  return s;
}

/** Normais de face em espaço local, cacheadas. */
const normalCache = new Map<string, [number, number, number][]>();
function normalsFor(id: string): [number, number, number][] {
  let n = normalCache.get(id);
  if (!n) {
    const p = POLYHEDRA[id]!;
    n = p.faces.map((_, i) => [...faceNormal(p, i)] as [number, number, number]);
    normalCache.set(id, n);
  }
  return n;
}

/**
 * Qual face o observador está lendo.
 *
 * Por padrão é a face mais voltada para cima — o critério de um dado na mesa.
 * Mas nem todo sólido tem uma face horizontal no repouso: o d10 é um
 * trapezoedro, ele apoia num kite e o kite oposto fica inclinado ~43°. A face
 * de maior componente Y ficava quase de perfil para a câmera, e o número
 * simplesmente não era visível.
 *
 * Passando a direção de onde se olha, a face escolhida passa a ser a que o
 * jogador de fato lê. Como a numeração é atribuída DEPOIS (ADR-0010), isso não
 * afeta a justiça do resultado — só a legibilidade.
 *
 * @param viewDir Direção da cena para o observador. Padrão: +Y.
 */
export function topFaceOf(
  dieId: string,
  q: CANNON.Quaternion,
  viewDir: readonly [number, number, number] = [0, 1, 0],
): number {
  const normals = normalsFor(dieId);
  const v = new CANNON.Vec3();
  const len = Math.hypot(viewDir[0], viewDir[1], viewDir[2]) || 1;
  const dx = viewDir[0] / len;
  const dy = viewDir[1] / len;
  const dz = viewDir[2] / len;

  let best = -Infinity;
  let bestIndex = 0;
  for (let i = 0; i < normals.length; i++) {
    const n = normals[i]!;
    v.set(n[0], n[1], n[2]);
    q.vmult(v, v);
    const score = v.x * dx + v.y * dy + v.z * dz;
    if (score > best) {
      best = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * O dado assentou de verdade, ou ficou escorado?
 *
 * Um poliedro em repouso sobre uma face tem a normal DESSA face apontando para
 * baixo. Equilibrado numa aresta ou num vértice, nenhuma normal chega perto de
 * −1. O limiar é por sólido porque o d10 é um trapezoedro: ele apoia num kite
 * inclinado e não passa de cerca de −0,73 nem quando está perfeitamente estável.
 */
function isSettled(dieId: string, q: CANNON.Quaternion): boolean {
  const normals = normalsFor(dieId);
  const v = new CANNON.Vec3();
  let lowest = 1;
  for (const n of normals) {
    v.set(n[0], n[1], n[2]);
    q.vmult(v, v);
    if (v.y < lowest) lowest = v.y;
  }
  return lowest <= (dieId === 'd10' ? -0.5 : -0.7);
}

export function simulate(opts: SimOptions): SimResult {
  const { dice, seed, maxSteps = 300, record = false, viewDir } = opts;
  const rng = mulberry32(seed);
  const t0 = performance.now();

  const TRAY_HALF = trayHalfFor(dice.length);

  try {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.allowSleep = true;
    // Solver com muitas iterações: é a principal mitigação dos problemas
    // conhecidos de colisão convexo-convexo do cannon-es.
    // 12 iteracoes: a varredura mostrou 0% degenerado de 8 a 20, e o custo e
    // dominado pelos passos ate assentar, nao pelo solver.
    (world.solver as CANNON.GSSolver).iterations = 12;
    (world.solver as CANNON.GSSolver).tolerance = 0.0005;

    const dieMat = new CANNON.Material('die');
    const trayMat = new CANNON.Material('tray');
    world.addContactMaterial(
      new CANNON.ContactMaterial(dieMat, trayMat, { friction: 0.6, restitution: 0.12 }),
    );
    world.addContactMaterial(
      new CANNON.ContactMaterial(dieMat, dieMat, { friction: 0.45, restitution: 0.1 }),
    );

    // Chão e paredes.
    const floor = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: trayMat });
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floor);

    // FORMAÇÃO DE ARREMESSO — calculada ANTES das paredes, porque a parede da
    // frente precisa ficar atrás do dado mais distante.
    //
    // Duas restrições brigam entre si: dois dados não podem nascer a menos de
    // 2 unidades um do outro (todos têm raio 1, senão nascem interpenetrados e o
    // solver os cospe para fora), e a fileira precisa caber entre as laterais.
    // A saída é o zigue-zague: 1,8 de separação lateral com 1,3 de defasagem em
    // profundidade dá √(1,8² + 1,3²) ≈ 2,22 de distância real.
    const SPREAD_X = 1.8;
    const ZIGZAG_Z = 1.3;
    const ROW_GAP = 2.4;
    const cols = Math.max(
      1,
      Math.min(dice.length, Math.floor((2 * TRAY_HALF - 2) / SPREAD_X) + 1),
    );
    const rows = Math.ceil(dice.length / cols);
    const spawnZ = (i: number) =>
      TRAY_HALF * 1.35 + (i % 2) * ZIGZAG_Z + Math.floor(i / cols) * ROW_GAP;

    // A parede da FRENTE fica atrás de TODA a formação. Com ela colada no tray,
    // as fileiras de trás nasciam do lado de fora e ficavam presas ali — era o
    // que reprovava 18% das rolagens de 10 dados.
    const FRONT = TRAY_HALF * 1.35 + ZIGZAG_Z + (rows - 1) * ROW_GAP + 2.5;
    const walls: Array<[number, number, number, number]> = [
      [TRAY_HALF, 0, 0, -Math.PI / 2],
      [-TRAY_HALF, 0, 0, Math.PI / 2],
      [0, 0, FRONT, Math.PI],
      [0, 0, -TRAY_HALF, 0],
    ];
    for (const [x, y, z, ry] of walls) {
      const w = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: trayMat });
      w.position.set(x, y, z);
      w.quaternion.setFromEuler(0, ry, 0);
      world.addBody(w);
    }

    // Os dados.
    const bodies: CANNON.Body[] = [];
    for (let i = 0; i < dice.length; i++) {
      const id = dice[i]!;
      const body = new CANNON.Body({
        mass: 1,
        shape: shapeFor(id),
        material: dieMat,
        allowSleep: true,
        sleepSpeedLimit: 0.35,
        sleepTimeLimit: 0.12,
        // Amortecimento alto encurta a rolagem sem deixá-la artificial: um
        // dado em feltro para em pouco mais de um segundo.
        linearDamping: 0.12,
        angularDamping: 0.24,
      });
      // ARREMESSO: os dados são atirados de fora da tela, pela base, cruzam o
      // tray em arco e batem na parede do fundo. É bem mais bonito que deixá-los
      // cair de cima — dá para ver os dados CHEGANDO.
      //
      // Nascem atrás da parede da frente (que fica em FRONT, mais longe) e por
      // isso fora do enquadramento da câmera.
      const lane = cols > 1 ? (i % cols) - (cols - 1) / 2 : 0;
      const row = Math.floor(i / cols);

      // A altura importa: nascendo com o centro a y≈1 o dado já encosta no chão,
      // o atrito come a velocidade no primeiro passo e ele para onde nasceu.
      // Voando a y≈2 ele cruza o tray antes do primeiro toque.
      body.position.set(
        lane * SPREAD_X + (rng() - 0.5) * 0.25,
        1.9 + row * 0.45 + rng() * 0.45,
        spawnZ(i) + rng() * 0.2,
      );
      // Forte em −Z para atravessar o tray, com componente vertical que faz o
      // arco. A gravidade traz de volta antes de bater na parede do fundo.
      body.velocity.set(
        lane * -1.1 + (rng() - 0.5) * 1.4,
        1.4 + rng() * 1.2,
        // As fileiras de trás nascem mais longe: sem impulso extra elas param
        // no meio do caminho e o dado fica fora do tray.
        // Quanto mais atrás nasce, mais impulso precisa para alcançar o tray.
        -(6.2 + (spawnZ(i) - TRAY_HALF * 1.35) * 1.35 + rng() * 2.2),
      );
      body.angularVelocity.set((rng() - 0.5) * 16, (rng() - 0.5) * 16, (rng() - 0.5) * 16);
      body.quaternion.setFromEuler(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
      world.addBody(body);
      bodies.push(body);
    }

    // Buffer por dado, dimensionado pelo teto de passos e cortado no fim.
    const tracks: Float32Array[] = record
      ? dice.map(() => new Float32Array(maxSteps * 7))
      : [];
    let restStreak = 0;
    let steps = 0;

    for (; steps < maxSteps; steps++) {
      // step() e nao fixedStep(): fixedStep consulta o relogio real para decidir
      // quantos sub-passos dar, entao num loop headless o tempo nao avanca.
      world.step(STEP);

      if (record) {
        const o = steps * 7;
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i]!;
          const d = tracks[i]!;
          d[o] = b.position.x;
          d[o + 1] = b.position.y;
          d[o + 2] = b.position.z;
          d[o + 3] = b.quaternion.x;
          d[o + 4] = b.quaternion.y;
          d[o + 5] = b.quaternion.z;
          d[o + 6] = b.quaternion.w;
        }
      }

      const settled = bodies.every(
        (b) =>
          b.sleepState === CANNON.Body.SLEEPING ||
          (b.velocity.length() < REST_LINEAR && b.angularVelocity.length() < REST_ANGULAR),
      );
      restStreak = settled ? restStreak + 1 : 0;
      if (restStreak >= REST_FRAMES) {
        steps++;
        break;
      }
    }

    const frames: DieTrack[] = record
      ? tracks.map((d) => ({ data: d.subarray(0, steps * 7), steps }))
      : [];

    const cpuMs = performance.now() - t0;

    // --- validação da gravação, antes de qualquer pixel (doc 08 §1.2) ---
    if (restStreak < REST_FRAMES) {
      return { ok: false, degeneracy: 'no-rest', steps, cpuMs, frames, topFaces: [] };
    }
    for (const b of bodies) {
      if (b.position.y < -0.5) {
        return { ok: false, degeneracy: 'below-floor', steps, cpuMs, frames, topFaces: [] };
      }
      if (Math.abs(b.position.x) > TRAY_HALF + 1 || Math.abs(b.position.z) > TRAY_HALF + 1.2) {
        return { ok: false, degeneracy: 'out-of-tray', steps, cpuMs, frames, topFaces: [] };
      }
      if (b.position.y > TRAY_WALL_H) {
        return { ok: false, degeneracy: 'out-of-tray', steps, cpuMs, frames, topFaces: [] };
      }
    }

    // Dado escorado é gravação degenerada — mas SÓ vale checar com um dado.
    //
    // Com vários, eles encostam uns nos outros e ficam inclinados por um motivo
    // legítimo: é o que acontece numa mesa de verdade. Aplicar o filtro ali
    // rejeitava 17% das rolagens de 10 dados sem que houvesse defeito nenhum.
    if (dice.length === 1 && !isSettled(dice[0]!, bodies[0]!.quaternion)) {
      return { ok: false, degeneracy: 'no-rest', steps, cpuMs, frames, topFaces: [] };
    }

    const topFaces = bodies.map((b, i) => topFaceOf(dice[i]!, b.quaternion, viewDir));
    return { ok: true, steps, cpuMs, frames, topFaces };
  } catch {
    return {
      ok: false,
      degeneracy: 'exception',
      steps: 0,
      cpuMs: performance.now() - t0,
      frames: [],
      topFaces: [],
    };
  }
}
