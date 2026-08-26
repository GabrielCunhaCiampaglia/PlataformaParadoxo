import * as THREE from 'three';
import { faceCentroid, faceNormal, type Polyhedron } from './polyhedra.js';

/**
 * Converte um `Polyhedron` em `BufferGeometry`, com UVs que mapeiam CADA FACE
 * para uma célula própria de um atlas de textura.
 *
 * É assim que o número aparece na face certa: a face `i` lê a célula `i` do
 * atlas, e o atlas é gerado depois da simulação, já com a rotulagem correta
 * (ADR-0010). Trocar o número de uma face é trocar a textura — a geometria
 * nunca muda.
 */

/**
 * Base ortonormal do plano de uma face, ALINHADA COM A GEOMETRIA DELA.
 *
 * A versão anterior derivava a base de um vetor auxiliar do mundo (+Y ou +X).
 * Isso é arbitrário: nada nele tem relação com a face, e o número saía impresso
 * em ângulo aleatório em relação às arestas — "torto", mesmo quando o dado
 * assentava direito. Num dado de verdade o número é alinhado com a face.
 *
 * Aqui a base sai da PRÓPRIA face:
 *  - o eixo U segue a primeira aresta, então o número fica paralelo a ela;
 *  - em faces alongadas (o kite do d10), o eixo V segue o eixo longo, que é
 *    como o número é impresso num d10 real.
 */
function faceBasis(
  vertices: THREE.Vector3[],
  centroid: THREE.Vector3,
  normal: THREE.Vector3,
): { u: THREE.Vector3; v: THREE.Vector3 } {
  // Quão longe cada vértice está do centro. Num kite, um deles destoa.
  const dists = vertices.map((p) => p.distanceTo(centroid));
  const maxD = Math.max(...dists);
  const minD = Math.min(...dists);

  let u: THREE.Vector3;
  if (maxD > minD * 1.45) {
    // Face alongada: V ao longo do eixo maior, do vértice distante ao centro.
    const apex = vertices[dists.indexOf(maxD)]!;
    const v = apex.clone().sub(centroid).normalize();
    u = new THREE.Vector3().crossVectors(v, normal).normalize();
    return { u, v: new THREE.Vector3().crossVectors(normal, u).normalize() };
  }

  // Face regular: U ao longo da primeira aresta.
  u = vertices[1]!.clone().sub(vertices[0]!);
  u.addScaledVector(normal, -u.dot(normal)).normalize();
  const v = new THREE.Vector3().crossVectors(normal, u).normalize();
  return { u, v };
}

export interface DiceGeometryResult {
  geometry: THREE.BufferGeometry;
  /** Lado do atlas em células: `cols × cols` cobre todas as faces. */
  cols: number;
  /**
   * Largura ÷ altura da face, em unidades de mundo.
   *
   * A célula do atlas é quadrada, mas a face quase nunca é: o triângulo do d20
   * é mais alto que largo, e o kite do d10 é MUITO mais alto que largo. Como
   * cada eixo da UV é normalizado pelo seu próprio alcance — necessário, senão
   * o número cai fora da face —, a célula quadrada é espremida sobre uma face
   * não quadrada, e o número sai DEFORMADO.
   *
   * O atlas desenha o dígito pré-esticado pelo inverso disto, e a deformação se
   * cancela na leitura. Todas as faces de um mesmo sólido são congruentes,
   * então um valor por dado basta.
   */
  aspect: number;
  /**
   * Onde caem os CANTOS de cada face dentro da própria célula do atlas, e a
   * qual vértice do sólido cada canto pertence. `corners[f][k]` é o canto `k`
   * da face `f`, em coordenadas de célula (0..1, com `v` crescendo para cima).
   *
   * É o que permite numerar o d4 como um d4 de verdade: como um tetraedro
   * apoiado numa face não tem face para cima, o número vai nos cantos e o
   * resultado é o que está no vértice do topo. Os três cantos que compartilham
   * esse vértice mostram o mesmo número, em qualquer face que se olhe.
   */
  corners: Array<Array<{ vertex: number; u: number; v: number }>>;
}

/**
 * @param inset Quanto o desenho da face encolhe dentro da célula, para o número
 *   não encostar na borda nem vazar para a célula vizinha.
 */
export function buildDiceGeometry(p: Polyhedron, inset = 0.92): DiceGeometryResult {
  const cols = Math.ceil(Math.sqrt(p.faceCount));
  const cell = 1 / cols;

  let aspect = 1;
  const corners: DiceGeometryResult['corners'] = [];

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (let f = 0; f < p.faces.length; f++) {
    const face = p.faces[f]!;
    const n3 = faceNormal(p, f);
    const c3 = faceCentroid(p, f);
    const normal = new THREE.Vector3(n3[0], n3[1], n3[2]);
    const centroid = new THREE.Vector3(c3[0], c3[1], c3[2]);
    const worldVerts = face.map((vi) => {
      const p3 = p.vertices[vi]!;
      return new THREE.Vector3(p3[0], p3[1], p3[2]);
    });
    const { u, v } = faceBasis(worldVerts, centroid, normal);

    // Projeta os vértices no plano da face.
    const projected = worldVerts.map((w) => {
      const d = w.clone().sub(centroid);
      return new THREE.Vector2(d.dot(u), d.dot(v));
    });
    // Normaliza CADA EIXO pelo seu próprio alcance, e não os dois pelo raio.
    //
    // O kite do d10 é muito alongado: o ápice fica a ~0,97 do centroide e os
    // outros vértices a ~0,52. Normalizando tudo pelo maior, a face ocupava só
    // metade da célula nas direções curtas, e o número — desenhado no centro
    // com 55% da célula — caía inteiro fora da face. O d10 saía em branco.
    const halfX = Math.max(...projected.map((q) => Math.abs(q.x))) || 1;
    const halfY = Math.max(...projected.map((q) => Math.abs(q.y))) || 1;

    if (f === 0) aspect = halfX / halfY;

    // Célula deste índice de face no atlas.
    //
    // A LINHA é invertida de propósito. `CanvasTexture` usa `flipY = true`, então
    // a linha 0 do canvas é lida pela ÚLTIMA linha de V. Sem inverter aqui, a
    // face lia a célula espelhada verticalmente: a face 2 de um d6 (linha 0)
    // amostrava a célula 8 (linha 2).
    //
    // O sintoma era enganoso. Sólidos com número ÍMPAR de colunas têm uma linha
    // central invariante — d6 e d20 acertavam quando a face caía nela, e erravam
    // no resto. O d10 tem 4 colunas, sem linha invariante, e por isso NUNCA
    // mostrava número. E o d4, com 2×2 células todas ocupadas, mostrava sempre
    // um número — o ERRADO.
    const cx = (f % cols) * cell;
    const cy = (cols - 1 - Math.floor(f / cols)) * cell;

    const cellCorners: Array<{ vertex: number; u: number; v: number }> = [];

    const faceUVs = projected.map((q, k) => {
      const nx = (q.x / halfX) * 0.5 * inset + 0.5;
      // Dentro da célula, V CRESCE com o "para cima" da face.
      //
      // Com `flipY`, px.y = (1 − uv.y)·size: um V maior lê uma linha mais ALTA
      // do canvas. Como o eixo `v` da base já aponta para o topo da tela, a
      // relação é direta. A inversão necessária é só a da LINHA da célula,
      // acima — inverter aqui também deixava o número de cabeça para baixo.
      const ny = 0.5 + (q.y / halfY) * 0.5 * inset;
      cellCorners.push({ vertex: face[k]!, u: nx, v: ny });
      return new THREE.Vector2(cx + nx * cell, cy + ny * cell);
    });
    corners.push(cellCorners);

    // Triangula em leque. Faces convexas — sempre válido.
    for (let i = 1; i < face.length - 1; i++) {
      for (const k of [0, i, i + 1]) {
        const vert = p.vertices[face[k]!]!;
        positions.push(vert[0], vert[1], vert[2]);
        normals.push(normal.x, normal.y, normal.z);
        const q = faceUVs[k]!;
        uvs.push(q.x, q.y);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();

  return { geometry, cols, aspect, corners };
}

/** Raio da esfera que contém o sólido — usado para enquadrar a câmera. */
export function circumradius(p: Polyhedron): number {
  return Math.max(...p.vertices.map((v) => Math.hypot(v[0], v[1], v[2])));
}
