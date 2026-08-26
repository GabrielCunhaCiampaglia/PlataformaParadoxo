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
  /** Resolução de cada célula. 160 já cobre o dado em tela cheia num celular. */
  cellSize?: number;
  color?: string;
  /**
   * Largura ÷ altura da face, vindo de `buildDiceGeometry`.
   *
   * A célula é quadrada e a face não é, então o dígito precisa ser desenhado
   * pré-esticado pelo inverso — senão ele chega deformado na face. Ver o campo
   * `aspect` em `DiceGeometryResult`.
   */
  aspect?: number;
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
  /**
   * Numeração POR VÉRTICE, como num d4 de verdade.
   *
   * Um tetraedro apoiado numa face não tem face para cima — o que aponta para
   * cima é um vértice, e a melhor face fica a uns 60° da câmera. Por isso um d4
   * real traz três números por face, um em cada canto, e o resultado é o que
   * está no canto do topo: as três faces visíveis mostram o mesmo número ali.
   *
   * Passando `corners` (de `buildDiceGeometry`) junto de `vertexLabels`, o
   * atlas desenha nesse esquema em vez de um número centralizado por face.
   */
  corners?: Array<Array<{ vertex: number; u: number; v: number }>>;
  /** `vertexLabels[v]` é o número do vértice `v`. */
  vertexLabels?: number[];
  /** Vértice que ficou para cima; os demais saem atenuados. */
  topVertex?: number;
}

const AMBIGUOUS = new Set([6, 9, 66, 68, 86, 89, 98, 99]);

/** A família do design system. O peso 800 é o ExtraBold declarado no index.css. */
const FAMILY = '"Helvetica Now Display", ui-sans-serif, system-ui, sans-serif';

let fontReady: Promise<unknown> | null = null;

/**
 * Garante que a webfont esteja carregada ANTES de o atlas ser desenhado.
 *
 * O canvas 2D não espera por `@font-face`: se a fonte ainda não chegou, ele
 * resolve `ctx.font` com o fallback do sistema, em silêncio, e o número sai
 * desenhado em Segoe UI. Como `font-display: swap` só afeta o DOM, o texto da
 * página corrigia sozinho e só o dado ficava com a fonte errada — que é
 * exatamente o "número feio" reclamado.
 */
export function ensureDiceFont(): Promise<unknown> {
  if (fontReady) return fontReady;
  const fonts = (globalThis as { document?: Document }).document?.fonts;
  fontReady = fonts
    ? fonts.load(`800 100px ${FAMILY}`).catch(() => undefined)
    : Promise.resolve();
  return fontReady;
}

export function buildNumberAtlas(opts: AtlasOptions): THREE.CanvasTexture {
  const {
    labels,
    cols,
    cellSize = 160,
    color = '#ffffff',
    aspect = 1,
    underlineAmbiguous = true,
    onlyFace,
    corners,
    vertexLabels,
    topVertex,
  } = opts;
  const size = cols * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');

  // Desfaz a compressão que a face vai aplicar na horizontal.
  const stretchX = 1 / (aspect || 1);

  // Fundo transparente: o material pinta a cor do dado por baixo.
  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Desenha um dígito já posicionado, com o esticamento e o contraste padrão.
  const digit = (text: string, fontSize: number, alpha: number) => {
    ctx.font = `800 ${fontSize}px ${FAMILY}`;
    ctx.globalAlpha = alpha;

    // Sombra difusa em vez do contorno grosso de antes.
    //
    // O contorno tinha 14% do corpo da fonte e junta de canto arredondado: ele
    // engordava o dígito até os vãos do 6 e do 8 quase fecharem, e era boa
    // parte da impressão de fonte feia. A sombra dá o mesmo contraste sobre a
    // parte clara do dado sem tocar no desenho da letra.
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = fontSize * 0.16;
    ctx.shadowOffsetY = fontSize * 0.04;
    ctx.lineWidth = fontSize * 0.06;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeText(text, 0, 0);

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.globalAlpha = 1;
  };

  if (corners && vertexLabels) {
    for (let f = 0; f < corners.length; f++) {
      if (onlyFace !== undefined && f !== onlyFace) continue;
      const originX = (f % cols) * cellSize;
      const originY = Math.floor(f / cols) * cellSize;

      for (const c of corners[f]!) {
        const value = vertexLabels[c.vertex];
        if (value === undefined) continue;

        const isTop = c.vertex === topVertex;

        // Puxa o dígito do canto para dentro da face.
        //
        // Não é só para não sangrar pela aresta. Visto de cima, o vértice do
        // topo de um tetraedro projeta num PONTO no meio da tela: os três
        // dígitos do resultado, um por face visível, caíam todos ali e viravam
        // um borrão. Recuando o do resultado mais que os outros, eles se abrem
        // em três números separados em volta do ápice — e continuam sendo
        // números de canto, como num d4 impresso.
        const pull = isTop ? 0.26 : 0.78;
        const pu = 0.5 + (c.u - 0.5) * pull;
        const pv = 0.5 + (c.v - 0.5) * pull;

        // O dígito aponta o topo PARA o canto, que é como um d4 é impresso: ele
        // fica de pé para quem lê pelo vértice em que está. A direção é medida
        // em espaço de face, não de célula — daí o `aspect` corrigindo o eixo U.
        const angle = Math.atan2((c.u - 0.5) * aspect, c.v - 0.5);

        ctx.save();
        // `v` cresce para cima na célula e para baixo no canvas.
        ctx.translate(originX + pu * cellSize, originY + (1 - pv) * cellSize);
        ctx.scale(stretchX, 1);
        ctx.rotate(angle);
        digit(String(value), cellSize * (isTop ? 0.44 : 0.17), isTop ? 1 : 0.13);
        ctx.restore();
      }
    }
    return finish(canvas);
  }

  for (let i = 0; i < labels.length; i++) {
    if (onlyFace !== undefined && i !== onlyFace) continue;
    const value = labels[i]!;
    const cx = (i % cols) * cellSize + cellSize / 2;
    const cy = Math.floor(i / cols) * cellSize + cellSize / 2;

    const text = String(value).padStart(value >= 0 && value < 10 ? 1 : 2, '0');
    const twoDigit = text.length > 1;

    // Números de dois dígitos precisam de fonte menor para caber na face.
    let fontSize = cellSize * (twoDigit ? 0.40 : 0.50);
    const setFont = () => {
      ctx.font = `800 ${fontSize}px ${FAMILY}`;
    };
    setFont();

    // O stretch entra na largura, então o limite tem de ser medido DEPOIS dele,
    // senão um kite muito alongado joga o dígito para fora da face.
    const maxInk = cellSize * (twoDigit ? 0.60 : 0.44);
    const inked = ctx.measureText(text).width * stretchX;
    if (inked > maxInk) {
      fontSize *= maxInk / inked;
      setFont();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(stretchX, 1);

    digit(text, fontSize, 1);

    if (underlineAmbiguous && AMBIGUOUS.has(value)) {
      const w = ctx.measureText(text).width;
      const y = fontSize * 0.46;
      ctx.fillRect(-w / 2, y, w, Math.max(2, fontSize * 0.07));
    }

    ctx.restore();
  }

  return finish(canvas);
}

function finish(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Anisotropia 2: o dado é visto quase de frente, não em ângulo rasante.
  texture.anisotropy = 2;

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
