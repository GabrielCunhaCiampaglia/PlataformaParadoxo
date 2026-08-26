/**
 * As cinco geometrias do catálogo (doc 08 §2).
 *
 * Definidas por matemática pura — sem three.js — para que o harness headless
 * rode em Node sem tocar em WebGL.
 *
 * Requisito estrutural do cannon-es: faces adjacentes NÃO podem ser coplanares,
 * senão o clipping convexo-convexo quebra com `otherFace` indefinido. Por isso o
 * d10 usa kites planares de verdade em vez de triângulos, e `validate()` confere.
 */

export type Vec3 = readonly [number, number, number];

export interface Polyhedron {
  id: string;
  /** Faces do dado, para efeito de rolagem. */
  faceCount: number;
  vertices: Vec3[];
  /** Índices em `vertices`, em ordem anti-horária vista de fora. */
  faces: number[][];
}

const PHI = (1 + Math.sqrt(5)) / 2;

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}
function normalize(a: Vec3): Vec3 {
  const n = norm(a);
  return [a[0] / n, a[1] / n, a[2] / n];
}

/** Normal de uma face, apontando para fora do centro do sólido. */
export function faceNormal(p: Polyhedron, faceIndex: number): Vec3 {
  const f = p.faces[faceIndex]!;
  const a = p.vertices[f[0]!]!;
  const b = p.vertices[f[1]!]!;
  const c = p.vertices[f[2]!]!;
  return normalize(cross(sub(b, a), sub(c, a)));
}

/** Centro geométrico de uma face. */
export function faceCentroid(p: Polyhedron, faceIndex: number): Vec3 {
  const f = p.faces[faceIndex]!;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const i of f) {
    const v = p.vertices[i]!;
    x += v[0];
    y += v[1];
    z += v[2];
  }
  return [x / f.length, y / f.length, z / f.length];
}

/**
 * Garante que cada face tenha os vértices em ordem anti-horária vista de fora,
 * ou seja, normal apontando para longe da origem. Inverte a ordem quando não.
 */
function orient(p: Polyhedron): Polyhedron {
  const faces = p.faces.map((f, i) => {
    const n = faceNormal(p, i);
    const c = faceCentroid(p, i);
    return dot(n, c) < 0 ? [...f].reverse() : f;
  });
  return { ...p, faces };
}

// ---------------------------------------------------------------- d4

const tetrahedron: Polyhedron = {
  id: 'd4',
  faceCount: 4,
  vertices: [
    [1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ],
  faces: [
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3],
    [1, 3, 2],
  ],
};

// ---------------------------------------------------------------- d6

const cube: Polyhedron = {
  id: 'd6',
  faceCount: 6,
  vertices: [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ],
  faces: [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [0, 4, 7, 3],
    [1, 2, 6, 5],
  ],
};

// ---------------------------------------------------------------- d8

const octahedron: Polyhedron = {
  id: 'd8',
  faceCount: 8,
  vertices: [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ],
  faces: [
    [0, 2, 4],
    [2, 1, 4],
    [1, 3, 4],
    [3, 0, 4],
    [2, 0, 5],
    [1, 2, 5],
    [3, 1, 5],
    [0, 3, 5],
  ],
};

// ---------------------------------------------------------------- d10

/**
 * Trapezoedro pentagonal — 10 faces em forma de kite.
 *
 * Para o kite [ápice, A_i, B_i, A_{i+1}] ser PLANAR, a altura do ápice e a
 * altura dos anéis precisam satisfazer uma relação exata. No plano de simetria
 * que passa por B_i, os pontos N=(0,h), M=(r·cos(π/n), z0) e B=(r, −z0) têm de
 * ser colineares. Resolvendo:
 *
 *     h = z0 · (1 + cos(π/n)) / (1 − cos(π/n))
 *
 * Com n = 5, isso dá h ≈ 9,472·z0. Escolhendo h = 1 e r = 1, os anéis ficam em
 * z ≈ ±0,106 — quase no equador, com ápices pontudos. É exatamente a silhueta
 * de um d10 físico.
 */
function pentagonalTrapezohedron(): Polyhedron {
  const n = 5;
  const r = 1;
  const h = 1;
  const c = Math.cos(Math.PI / n);
  const z0 = (h * (1 - c)) / (1 + c);

  const vertices: Vec3[] = [];
  const N = vertices.push([0, h, 0] as Vec3) - 1;
  const S = vertices.push([0, -h, 0] as Vec3) - 1;

  const A: number[] = [];
  const B: number[] = [];
  for (let i = 0; i < n; i++) {
    const tA = (2 * Math.PI * i) / n;
    const tB = tA + Math.PI / n;
    A.push(vertices.push([r * Math.cos(tA), z0, r * Math.sin(tA)] as Vec3) - 1);
    B.push(vertices.push([r * Math.cos(tB), -z0, r * Math.sin(tB)] as Vec3) - 1);
  }

  const faces: number[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([N, A[i]!, B[i]!, A[j]!]); // hemisfério norte
    faces.push([S, B[j]!, A[j]!, B[i]!]); // hemisfério sul
  }

  return { id: 'd10', faceCount: 10, vertices, faces };
}

// ---------------------------------------------------------------- d20

function icosahedron(): Polyhedron {
  const vertices: Vec3[] = [
    [-1, PHI, 0],
    [1, PHI, 0],
    [-1, -PHI, 0],
    [1, -PHI, 0],
    [0, -1, PHI],
    [0, 1, PHI],
    [0, -1, -PHI],
    [0, 1, -PHI],
    [PHI, 0, -1],
    [PHI, 0, 1],
    [-PHI, 0, -1],
    [-PHI, 0, 1],
  ];
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  return { id: 'd20', faceCount: 20, vertices, faces };
}

// ---------------------------------------------------------------- registro

/**
 * Escala o sólido para que o vértice mais distante fique a `radius` do centro.
 *
 * Sem isto os dados teriam tamanhos MUITO diferentes na mesa — o cubo nasce com
 * raio 1,73 e o icosaedro com 1,90, contra 1,00 do d10. Visualmente um d6
 * pareceria quase o dobro de um d10, e no arremesso eles nasceriam sobrepostos.
 */
function scaleToRadius(p: Polyhedron, radius = 1): Polyhedron {
  const max = Math.max(...p.vertices.map((v) => Math.hypot(v[0], v[1], v[2])));
  const k = radius / max;
  return {
    ...p,
    vertices: p.vertices.map((v) => [v[0] * k, v[1] * k, v[2] * k] as Vec3),
  };
}

export const POLYHEDRA: Record<string, Polyhedron> = {
  d4: scaleToRadius(orient(tetrahedron)),
  d6: scaleToRadius(orient(cube)),
  d8: scaleToRadius(orient(octahedron)),
  d10: scaleToRadius(orient(pentagonalTrapezohedron())),
  d20: scaleToRadius(orient(icosahedron())),
};

export interface ValidationIssue {
  polyhedron: string;
  kind: 'coplanar' | 'non-planar-face' | 'face-count' | 'degenerate';
  detail: string;
}

/**
 * Confere o que o cannon-es exige e o que o dado exige:
 *  - nenhum par de faces adjacentes coplanares (quebra o clipping convexo);
 *  - todo vértice de uma face está no plano dessa face (kites do d10);
 *  - número de faces igual ao esperado, e nenhuma face degenerada.
 */
export function validate(p: Polyhedron): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (p.faces.length !== p.faceCount) {
    issues.push({
      polyhedron: p.id,
      kind: 'face-count',
      detail: `esperado ${p.faceCount} faces, encontrado ${p.faces.length}`,
    });
  }

  const normals = p.faces.map((_, i) => faceNormal(p, i));

  for (let i = 0; i < p.faces.length; i++) {
    const n = normals[i]!;
    if (!Number.isFinite(n[0]) || norm(n) < 0.5) {
      issues.push({ polyhedron: p.id, kind: 'degenerate', detail: `face ${i} é degenerada` });
      continue;
    }

    // Planaridade: todo vértice da face precisa estar no plano dela.
    const c = faceCentroid(p, i);
    for (const vi of p.faces[i]!) {
      const d = Math.abs(dot(sub(p.vertices[vi]!, c), n));
      if (d > 1e-9) {
        issues.push({
          polyhedron: p.id,
          kind: 'non-planar-face',
          detail: `face ${i}, vértice ${vi}: desvio de ${d.toExponential(2)} do plano`,
        });
      }
    }

    // Coplanaridade entre faces distintas — o que derruba o cannon-es.
    for (let j = i + 1; j < p.faces.length; j++) {
      const m = normals[j]!;
      if (dot(n, m) > 1 - 1e-9) {
        const cj = faceCentroid(p, j);
        if (Math.abs(dot(sub(cj, c), n)) < 1e-9) {
          issues.push({
            polyhedron: p.id,
            kind: 'coplanar',
            detail: `faces ${i} e ${j} são coplanares`,
          });
        }
      }
    }
  }

  return issues;
}
