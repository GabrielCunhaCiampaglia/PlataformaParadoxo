import * as THREE from 'three';

/**
 * Atlas de números, desenhado em canvas.
 *
 * Uma célula por face. A célula `i` recebe o número que a rotulagem
 * pós-simulação atribuiu à face `i` — por isso a textura só pode ser gerada
 * DEPOIS de a física rodar (ADR-0010).
 */

export interface AtlasOptions {
  labels: number[];
  cols: number;
  /** Resolução de cada célula. 256 é suficiente até num tray em tela cheia. */
  cellSize?: number;
  color?: string;
  /** d6 e d9 ficam ambíguos de cabeça para baixo; o traço resolve. */
  underlineAmbiguous?: boolean;
  /**
   * Quando definido, SÓ esta face recebe número — as outras ficam em branco.
   *
   * É o que o doc 08 §3.2 chama de opção 1, e resolve um problema real de
   * leitura: com todas as faces numeradas, o jogador vê quatro ou cinco números
   * ao mesmo tempo e não sabe qual é o resultado. Numerando só a face de cima,
   * o que está na tela é o resultado, sem ambiguidade.
   */
  onlyFace?: number;
}

const AMBIGUOUS = new Set([6, 9, 66, 68, 86, 89, 98, 99]);

export function buildNumberAtlas(opts: AtlasOptions): THREE.CanvasTexture {
  const { labels, cols, cellSize = 256, color = '#ffffff', underlineAmbiguous = true, onlyFace } = opts;
  const size = cols * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');

  // Fundo transparente: o material pinta a cor do dado por baixo.
  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < labels.length; i++) {
    if (onlyFace !== undefined && i !== onlyFace) continue;
    const value = labels[i]!;
    const cx = (i % cols) * cellSize + cellSize / 2;
    const cy = Math.floor(i / cols) * cellSize + cellSize / 2;

    const text = String(value).padStart(value >= 0 && value < 10 ? 1 : 2, '0');
    // Números de dois dígitos precisam de fonte menor para caber na face.
    const fontSize = text.length > 1 ? cellSize * 0.42 : cellSize * 0.55;
    ctx.font = `800 ${fontSize}px "Helvetica Now Display", system-ui, sans-serif`;

    // Halo escuro por trás: garante contraste mesmo sobre a parte clara do dado.
    ctx.lineWidth = fontSize * 0.14;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, cx, cy);

    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy);

    if (underlineAmbiguous && AMBIGUOUS.has(value)) {
      const w = ctx.measureText(text).width;
      const y = cy + fontSize * 0.46;
      ctx.fillRect(cx - w / 2, y, w, Math.max(2, fontSize * 0.07));
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  // SEM mipmaps. O número ocupa uma fração pequena da célula, e nos níveis
  // reduzidos ele se dissolvia no fundo transparente — o dado saía em branco.
  // Como a textura é lida praticamente na resolução nativa, o filtro linear
  // basta e ainda evita o custo de gerar a pirâmide.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Textura de uma célula só, usada quando o dado ainda não tem número.
 * Mantida separada para não realocar canvas a cada rolagem.
 */
export function buildBlankAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, 4, 4);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
