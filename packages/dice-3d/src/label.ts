import { POLYHEDRA } from './polyhedra.js';

/**
 * Rotulagem PÓS-SIMULAÇÃO — o coração do ADR-0010.
 *
 * O motor de regras já decidiu o número. A física já rodou, livre e verdadeira,
 * e sabemos qual face assentou para cima. Só agora atribuímos a numeração: a
 * face de cima recebe o valor decidido, e as demais recebem uma permutação
 * válida do resto.
 *
 * Não há snap, não há correção de rotação, não há busca por semente. E como os
 * dados rolam com as faces EM BRANCO e o número só aparece por fade ao assentar
 * (doc 08 §3), não existe troca a ser percebida.
 */

/** Valores impressos em cada tipo de dado. */
export function faceValuesFor(dieId: string, role?: 'tens' | 'units'): number[] {
  const p = POLYHEDRA[dieId];
  if (!p) throw new Error(`Geometria desconhecida: ${dieId}`);

  if (dieId === 'd10') {
    // d100 percentual: um d10 mostra 00,10..90 e o outro 0..9.
    if (role === 'tens') return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  }
  return Array.from({ length: p.faceCount }, (_, i) => i + 1);
}

export interface LabelOptions {
  dieId: string;
  /** Índice da face que assentou para cima, vindo da simulação. */
  topFaceIndex: number;
  /** O valor que o motor de regras decidiu. */
  targetValue: number;
  role?: 'tens' | 'units';
  /** Para embaralhar as demais faces de forma reprodutível. */
  rng?: () => number;
}

/**
 * Devolve o rótulo de cada face: `labels[i]` é o número impresso na face `i`.
 * A face `topFaceIndex` recebe `targetValue`.
 */
export function labelFaces(opts: LabelOptions): number[] {
  const { dieId, topFaceIndex, targetValue, role, rng = Math.random } = opts;
  const values = faceValuesFor(dieId, role);

  if (topFaceIndex < 0 || topFaceIndex >= values.length) {
    throw new Error(`Face ${topFaceIndex} fora do intervalo de ${dieId}`);
  }
  const pos = values.indexOf(targetValue);
  if (pos === -1) {
    throw new Error(`O valor ${targetValue} não existe num ${dieId} (papel: ${role ?? 'padrão'})`);
  }

  // Os demais valores, embaralhados, preenchem as outras faces.
  const rest = values.filter((_, i) => i !== pos);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }

  const labels = new Array<number>(values.length);
  labels[topFaceIndex] = targetValue;
  let k = 0;
  for (let i = 0; i < labels.length; i++) {
    if (i !== topFaceIndex) labels[i] = rest[k++]!;
  }
  return labels;
}

/**
 * O que o jogador lê na tela: o rótulo da face que ficou para cima.
 * É a função do teste de fogo — precisa bater com o motor em 100% dos casos.
 */
export function readTopValue(labels: number[], topFaceIndex: number): number {
  const v = labels[topFaceIndex];
  if (v === undefined) throw new Error(`Face ${topFaceIndex} não foi rotulada`);
  return v;
}

/** Decompõe um resultado de d100 nos dois d10 percentuais. */
export function splitPercentile(total: number): { tens: number; units: number } {
  if (!Number.isInteger(total) || total < 1 || total > 100) {
    throw new Error(`Resultado de d100 inválido: ${total}`);
  }
  if (total === 100) return { tens: 0, units: 0 };
  return { tens: Math.floor(total / 10) * 10, units: total % 10 };
}

/** Recompõe o d100 a partir das duas faces lidas — o inverso de `splitPercentile`. */
export function joinPercentile(tens: number, units: number): number {
  return tens === 0 && units === 0 ? 100 : tens + units;
}
