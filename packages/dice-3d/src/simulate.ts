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

export interface DieFrame {
  p: [number, number, number];
  q: [number, number, number, number];
}

export interface SimResult {
  ok: boolean;
  degeneracy?: Degeneracy;
  /** Passos de física até o repouso. */
  steps: number;
  cpuMs: number;
  /** frames[dado][passo] */
  frames: DieFrame[][];
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
const REST_LINEAR = 0.25;
const REST_ANGULAR = 0.35;

/** O tray cresce com a quantidade de dados: 10d6 nao cabem em 6,4 x 6,4. */
function trayHalfFor(count: number): number { return Math.max(3.2, 1.55 * Math.sqrt(count) + 1.1); }

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
 * Qual face está voltada para cima: a normal que, girada pelo quaternion do
 * corpo, tem a maior componente +Y.
 */
export function topFaceOf(dieId: string, q: CANNON.Quaternion): number {
  const normals = normalsFor(dieId);
  const v = new CANNON.Vec3();
  let best = -Infinity;
  let bestIndex = 0;
  for (let i = 0; i < normals.length; i++) {
    const n = normals[i]!;
    v.set(n[0], n[1], n[2]);
    q.vmult(v, v);
    if (v.y > best) {
      best = v.y;
      bestIndex = i;
    }
  }
  return bestIndex;
}

export function simulate(opts: SimOptions): SimResult {
  const { dice, seed, maxSteps = 420, record = false } = opts;
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

    const walls: Array<[number, number, number, number]> = [
      [TRAY_HALF, 0, 0, -Math.PI / 2],
      [-TRAY_HALF, 0, 0, Math.PI / 2],
      [0, 0, TRAY_HALF, Math.PI],
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
        sleepSpeedLimit: 0.3,
        sleepTimeLimit: 0.15,
        linearDamping: 0.06,
        angularDamping: 0.14,
      });
      // Arremesso: espalhados, caindo de alturas ligeiramente diferentes.
      // Grade, para 10 dados nao nascerem uns dentro dos outros.
      const cols = Math.ceil(Math.sqrt(dice.length));
      const gap = (TRAY_HALF * 1.5) / cols;
      const cx = (i % cols) - (cols - 1) / 2;
      const cz = Math.floor(i / cols) - (cols - 1) / 2;
      body.position.set(cx * gap + (rng() - 0.5) * 0.25, 2.2 + (i % 3) * 0.8 + rng() * 0.5, cz * gap + (rng() - 0.5) * 0.25);
      body.velocity.set((rng() - 0.5) * 3.5, -2.5 - rng() * 1.5, (rng() - 0.5) * 3.5);
      body.angularVelocity.set((rng() - 0.5) * 13, (rng() - 0.5) * 13, (rng() - 0.5) * 13);
      body.quaternion.setFromEuler(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
      world.addBody(body);
      bodies.push(body);
    }

    const frames: DieFrame[][] = dice.map(() => []);
    let restStreak = 0;
    let steps = 0;

    for (; steps < maxSteps; steps++) {
      // step() e nao fixedStep(): fixedStep consulta o relogio real para decidir
      // quantos sub-passos dar, entao num loop headless o tempo nao avanca.
      world.step(STEP);

      if (record) {
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i]!;
          frames[i]!.push({
            p: [b.position.x, b.position.y, b.position.z],
            q: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w],
          });
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

    const cpuMs = performance.now() - t0;

    // --- validação da gravação, antes de qualquer pixel (doc 08 §1.2) ---
    if (restStreak < REST_FRAMES) {
      return { ok: false, degeneracy: 'no-rest', steps, cpuMs, frames, topFaces: [] };
    }
    for (const b of bodies) {
      if (b.position.y < -0.5) {
        return { ok: false, degeneracy: 'below-floor', steps, cpuMs, frames, topFaces: [] };
      }
      if (Math.abs(b.position.x) > TRAY_HALF + 1 || Math.abs(b.position.z) > TRAY_HALF + 1) {
        return { ok: false, degeneracy: 'out-of-tray', steps, cpuMs, frames, topFaces: [] };
      }
      if (b.position.y > TRAY_WALL_H) {
        return { ok: false, degeneracy: 'out-of-tray', steps, cpuMs, frames, topFaces: [] };
      }
    }

    const topFaces = bodies.map((b, i) => topFaceOf(dice[i]!, b.quaternion));
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
