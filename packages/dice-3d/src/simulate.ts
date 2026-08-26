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

/** Quantas vezes um dado ilegível pode ser empurrado antes de a rolagem ser descartada. */
const MAX_NUDGES = 4;
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
 * Vértices em espaço local, cacheados. Usados só pelo d4.
 */
const vertexCache = new Map<string, [number, number, number][]>();
function verticesFor(id: string): [number, number, number][] {
  let v = vertexCache.get(id);
  if (!v) {
    v = POLYHEDRA[id]!.vertices.map((p) => [...p] as [number, number, number]);
    vertexCache.set(id, v);
  }
  return v;
}

/**
 * Qual VÉRTICE o observador está lendo. Só faz sentido para o d4.
 *
 * Um tetraedro apoiado numa face não tem face para cima: as três de cima ficam
 * a 70° da vertical, e a normal da melhor delas mal chega a 0,5 contra a
 * direção da câmera — medido, não estimado. Por isso um d4 de verdade traz o
 * número nos CANTOS, e o resultado é o que está no vértice do topo. É esse
 * vértice que esta função devolve.
 */
export function topVertexOf(
  dieId: string,
  q: CANNON.Quaternion,
  viewDir: readonly [number, number, number] = [0, 1, 0],
): number {
  const v = new CANNON.Vec3();
  const len = Math.hypot(viewDir[0], viewDir[1], viewDir[2]) || 1;
  let best = -Infinity;
  let bestIndex = 0;
  const verts = verticesFor(dieId);
  for (let i = 0; i < verts.length; i++) {
    const p = verts[i]!;
    v.set(p[0], p[1], p[2]);
    q.vmult(v, v);
    const score = (v.x * viewDir[0] + v.y * viewDir[1] + v.z * viewDir[2]) / len;
    if (score > best) {
      best = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** Maior e segundo maior produto escalar de uma lista de direções contra a vista. */
function topTwo(
  dirs: [number, number, number][],
  q: CANNON.Quaternion,
  viewDir: readonly [number, number, number],
): { best: number; margin: number; lowestY: number } {
  const v = new CANNON.Vec3();
  const len = Math.hypot(viewDir[0], viewDir[1], viewDir[2]) || 1;
  let best = -Infinity;
  let second = -Infinity;
  let lowestY = 1;
  for (const d of dirs) {
    v.set(d[0], d[1], d[2]);
    q.vmult(v, v);
    if (v.y < lowestY) lowestY = v.y;
    const s = (v.x * viewDir[0] + v.y * viewDir[1] + v.z * viewDir[2]) / len;
    if (s > best) {
      second = best;
      best = s;
    } else if (s > second) {
      second = s;
    }
  }
  return { best, margin: best - second, lowestY };
}

/**
 * O jogador consegue LER este dado?
 *
 * O critério antigo perguntava se o dado tinha assentado, medindo se alguma
 * normal apontava para baixo. Era a pergunta errada, e o limiar de −0,7 ainda
 * por cima deixava passar o caso exato que ele deveria pegar: um cubo apoiado
 * numa ARESTA tem a normal mais baixa em −cos 45° = −0,707. Cerca de 5% das
 * rolagens de d6 saíam deitadas na aresta, com dois números meio virados para a
 * câmera e nenhum deles claramente o resultado.
 *
 * A pergunta certa é sobre a leitura: a face que vai receber o número precisa
 * estar de frente para a câmera E precisa estar sozinha nisso. Medido em 300
 * rolagens por sólido, um dado assentado dá `best` ≈ 0,977; os limiares abaixo
 * ficam bem acima do ruído e bem abaixo do repouso legítimo.
 *
 * O d4 é exceção e não tem conserto por limiar: ele nunca passa de ~0,5 porque
 * não existe face para cima num tetraedro. Nele o que se exige é apoio plano e
 * um vértice de topo inequívoco — o número é lido no canto. Ver `topVertexOf`.
 */
function isReadable(
  dieId: string,
  q: CANNON.Quaternion,
  viewDir: readonly [number, number, number],
): boolean {
  if (dieId === 'd4') {
    const flat = topTwo(normalsFor(dieId), q, viewDir).lowestY <= -0.95;
    return flat && topTwo(verticesFor(dieId), q, viewDir).margin >= 0.25;
  }
  const { best, margin } = topTwo(normalsFor(dieId), q, viewDir);
  return best >= 0.93 && margin >= 0.1;
}

export function simulate(opts: SimOptions): SimResult {
  // 300 passos bastam para assentar; a folga acima disso é para as cutucadas.
  const { dice, seed, maxSteps = 620, record = false, viewDir } = opts;
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

    // Buffer por dado, cortado no fim.
    //
    // Dimensionado pelo caso COMUM, não pelo teto. Uma rolagem assenta em ~120
    // passos; o teto de `maxSteps` só é alcançado quando há cutucada, que é
    // rara. Alocar o teto sempre custava caro onde mais dói — em 10 dados a
    // mediana subiu de 150 ms para 205 ms só de zerar buffer que ninguém usa.
    // O buffer cresce na primeira cutucada e só nela.
    let capacity = Math.min(maxSteps, 300);
    let tracks: Float32Array[] = record ? dice.map(() => new Float32Array(capacity * 7)) : [];
    const growTracks = () => {
      if (!record || capacity >= maxSteps) return;
      capacity = maxSteps;
      tracks = tracks.map((old) => {
        const bigger = new Float32Array(capacity * 7);
        bigger.set(old);
        return bigger;
      });
    };
    let restStreak = 0;
    let nudges = 0;
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
        // Dado escorado se CUTUCA, não se re-rola.
        //
        // Exigir que todo dado seja legível é a regra certa, mas rejeitar a
        // rolagem inteira por causa de um dado sai caro: com 10 dados a chance
        // de todos saírem bons de primeira é baixa, e a rolagem passou a custar
        // 449 ms contra 150 ms, com 16% delas esgotando as tentativas.
        //
        // Numa mesa de verdade ninguém re-rola tudo quando um dado fica de pé
        // contra o livro: empurra-se aquele dado. É o que acontece aqui, com o
        // impulso vindo do mesmo rng semeado, então a simulação segue
        // reprodutível. E como a cutucada entra na gravação, o jogador vê o
        // dado ser empurrado — não há corte nem salto.
        const view = viewDir ?? ([0, 1, 0] as const);
        const stuck = bodies.filter((b, i) => !isReadable(dice[i]!, b.quaternion, view));
        if (stuck.length === 0 || nudges >= MAX_NUDGES) {
          steps++;
          break;
        }
        nudges++;
        growTracks();
        for (const b of stuck) {
          b.wakeUp();
          b.velocity.set((rng() - 0.5) * 1.6, 2.4 + rng() * 0.8, (rng() - 0.5) * 1.6);
          b.angularVelocity.set(
            (rng() - 0.5) * 12,
            (rng() - 0.5) * 12,
            (rng() - 0.5) * 12,
          );
        }
        restStreak = 0;
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

    // A checagem vale para TODOS os dados, não só quando há um.
    //
    // A versão anterior só checava rolagem de um dado, com o argumento de que
    // vários dados se escoram por um motivo legítimo. O argumento vale para a
    // pose, não para a leitura: um dado escorado com dois números meio virados
    // para a câmera é ilegível esteja ele sozinho ou acompanhado, e o jogador
    // não tem como saber qual é o resultado.
    const view = viewDir ?? ([0, 1, 0] as const);
    for (let i = 0; i < bodies.length; i++) {
      if (!isReadable(dice[i]!, bodies[i]!.quaternion, view)) {
        return { ok: false, degeneracy: 'no-rest', steps, cpuMs, frames, topFaces: [] };
      }
    }

    // O d4 é lido no vértice do topo, não numa face. Ver `topVertexOf`.
    const topFaces = bodies.map((b, i) =>
      dice[i] === 'd4'
        ? topVertexOf('d4', b.quaternion, viewDir)
        : topFaceOf(dice[i]!, b.quaternion, viewDir),
    );
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
