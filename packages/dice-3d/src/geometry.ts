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

/** Base ortonormal do plano de uma face. */
function basisFor(normal: THREE.Vector3): { u: THREE.Vector3; v: THREE.Vector3 } {
  // Escolhe um vetor auxiliar que não seja paralelo à normal.
  const aux =
    Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(aux, normal).normalize();
  const v = new THREE.Vector3().crossVectors(normal, u).normalize();
  return { u, v };
}

/**
 * Base do plano de uma face ALINHADA para o texto ficar de pé na tela.
 *
 * A base arbitrária acima faz o número sair girado — um "17" deitado de lado é
 * legível, mas parece defeito. Como a geometria é construída depois da física,
 * dá para orientar a face vencedora usando a rotação final do dado: projeta-se
 * a direção "para cima na tela" no plano da face e usa-se ela como eixo V.
 *
 * @param screenUp Direção que aparece como "para cima" na tela, em espaço de
 *   mundo. Com a câmera olhando de cima, é −Z.
 */
function alignedBasis(
  normal: THREE.Vector3,
  quaternion: THREE.Quaternion,
  screenUp: THREE.Vector3,
): { u: THREE.Vector3; v: THREE.Vector3 } {
  // Traz o "para cima da tela" para o espaço LOCAL do dado.
  const inv = quaternion.clone().invert();
  const upLocal = screenUp.clone().applyQuaternion(inv);

  // Projeta no plano da face e normaliza. Se a projeção for degenerada
  // (a face está de topo para a tela), cai na base arbitrária.
  const v = upLocal.clone().addScaledVector(normal, -upLocal.dot(normal));
  if (v.lengthSq() < 1e-6) return basisFor(normal);
  v.normalize();

  const u = new THREE.Vector3().crossVectors(v, normal).normalize();
  return { u, v };
}

export interface OrientOptions {
  /** Índice da face a orientar — normalmente a que assentou para cima. */
  faceIndex: number;
  /** Rotação final do dado, vinda da simulação. */
  quaternion: THREE.Quaternion;
  /** Direção de "para cima na tela", em mundo. Padrão: −Z. */
  screenUp?: THREE.Vector3;
}

export interface DiceGeometryResult {
  geometry: THREE.BufferGeometry;
  /** Lado do atlas em células: `cols × cols` cobre todas as faces. */
  cols: number;
}

/**
 * @param inset Quanto o desenho da face encolhe dentro da célula, para o número
 *   não encostar na borda nem vazar para a célula vizinha.
 */
export function buildDiceGeometry(
  p: Polyhedron,
  inset = 0.92,
  orient?: OrientOptions,
): DiceGeometryResult {
  const cols = Math.ceil(Math.sqrt(p.faceCount));
  const cell = 1 / cols;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (let f = 0; f < p.faces.length; f++) {
    const face = p.faces[f]!;
    const n3 = faceNormal(p, f);
    const c3 = faceCentroid(p, f);
    const normal = new THREE.Vector3(n3[0], n3[1], n3[2]);
    const centroid = new THREE.Vector3(c3[0], c3[1], c3[2]);
    const { u, v } =
      orient && orient.faceIndex === f
        ? alignedBasis(normal, orient.quaternion, orient.screenUp ?? new THREE.Vector3(0, 0, -1))
        : basisFor(normal);

    // Projeta os vértices no plano da face e mede o raio, para normalizar.
    const projected = face.map((vi) => {
      const p3 = p.vertices[vi]!;
      const d = new THREE.Vector3(p3[0], p3[1], p3[2]).sub(centroid);
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

    const faceUVs = projected.map((q) => {
      const nx = (q.x / halfX) * 0.5 * inset + 0.5;
      // Dentro da célula, V CRESCE com o "para cima" da face.
      //
      // Com `flipY`, px.y = (1 − uv.y)·size: um V maior lê uma linha mais ALTA
      // do canvas. Como o eixo `v` da base já aponta para o topo da tela, a
      // relação é direta. A inversão necessária é só a da LINHA da célula,
      // acima — inverter aqui também deixava o número de cabeça para baixo.
      const ny = 0.5 + (q.y / halfY) * 0.5 * inset;
      return new THREE.Vector2(cx + nx * cell, cy + ny * cell);
    });

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

  return { geometry, cols };
}

/** Raio da esfera que contém o sólido — usado para enquadrar a câmera. */
export function circumradius(p: Polyhedron): number {
  return Math.max(...p.vertices.map((v) => Math.hypot(v[0], v[1], v[2])));
}
