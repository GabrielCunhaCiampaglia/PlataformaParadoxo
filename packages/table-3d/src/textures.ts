import * as THREE from 'three';

/**
 * Texturas da mesa, DESENHADAS EM CANVAS em vez de carregadas de arquivo.
 *
 * Não é economia de preguiça: é a decisão certa para esta estética. A referência
 * é PS1, onde uma textura de madeira tinha 64 ou 128 px — e nesse tamanho o ruído
 * procedural é indistinguível de uma foto reduzida, porque quase toda a
 * informação da foto se perde na redução de qualquer jeito.
 *
 * O que se ganha:
 *  - zero byte de asset no bundle, que já está estourando o orçamento;
 *  - nada para carregar pela rede, então a cena aparece pronta no primeiro frame;
 *  - a paleta sai de código, e acompanha o design system em vez de brigar com ele.
 *
 * Todas saem com filtro NEAREST e sem mipmap. É o que dá o serrilhado e o
 * cintilar característicos — num pipeline moderno isso seria defeito.
 */

/** Ruído determinístico. A mesa precisa ser a MESMA a cada carregamento. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return [c, ctx];
}

function toTexture(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // O par que faz a imagem ler como PS1: sem suavização e sem pirâmide de
  // mipmaps. O pixel da textura aparece como pixel, e a superfície cintila
  // quando a câmera anda — que é exatamente a memória visual do console.
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/**
 * Madeira: tábuas escuras, veio corrido, juntas marcadas.
 *
 * 128 px cobrindo uma tábua, repetida pelo tampo. A escala é escolhida para o
 * veio ficar visível a olho de quem está sentado, não fotorrealista de perto.
 */
export function woodTexture(size = 128): THREE.CanvasTexture {
  const [c, ctx] = canvas(size);
  const r = rng(0x5eed);

  ctx.fillStyle = '#5c4126';
  ctx.fillRect(0, 0, size, size);

  // Veio: linhas horizontais de espessura e tom variáveis.
  for (let i = 0; i < size * 2.2; i++) {
    const y = r() * size;
    const w = 0.5 + r() * 2.2;
    const shade = 0.5 + r() * 0.5;
    ctx.globalAlpha = 0.05 + r() * 0.16;
    ctx.fillStyle = shade > 0.78 ? '#7a5a38' : '#2e1e10';
    // Ondulação leve, para o veio não sair de régua.
    const wobble = Math.sin(i * 1.7) * 1.5;
    ctx.fillRect(0, y + wobble, size, w);
  }

  // Nós da madeira.
  ctx.globalAlpha = 1;
  for (let k = 0; k < 3; k++) {
    const nx = r() * size;
    const ny = r() * size;
    for (let ring = 7; ring > 0; ring--) {
      ctx.globalAlpha = 0.1 + r() * 0.1;
      ctx.strokeStyle = ring % 2 ? '#2a1c0e' : '#6b4c2c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(nx, ny, ring * 1.6, ring * 1.05, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Junta entre tábuas, na borda da célula — é ela que faz a repetição ler
  // como assoalho e não como padrão repetido.
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(0, 0, size, 2);

  ctx.globalAlpha = 1;
  return toTexture(c, 7);
}

/**
 * O papel da ficha, visto DE LONGE — ilegível de propósito.
 *
 * Aqui a baixa resolução deixa de ser concessão e vira ferramenta: o jogador
 * reconhece "é uma ficha preenchida" pelo ritmo dos blocos de texto sem
 * conseguir ler nada, que é o estado certo antes de ele aproximar. O texto
 * de verdade é HTML, e entra por cima quando a câmera chega.
 *
 * O desenho segue o layout da ficha oficial (doc 09): cabeçalho de identidade,
 * bloco de recursos à direita, coluna de perícias à esquerda, inventário abaixo.
 */
export function paperTexture(size = 256): THREE.CanvasTexture {
  const [c, ctx] = canvas(size);
  const r = rng(0xf1c4a);

  // Papel envelhecido, não branco.
  ctx.fillStyle = '#c9bda4';
  ctx.fillRect(0, 0, size, size);

  // Manchas de umidade e sujeira.
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.03 + r() * 0.06;
    ctx.fillStyle = r() > 0.5 ? '#8a7550' : '#6d5a3a';
    ctx.beginPath();
    ctx.ellipse(r() * size, r() * size, 6 + r() * 26, 5 + r() * 20, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const ink = '#33291c';
  const line = (x: number, y: number, w: number, h = 2, alpha = 0.75) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ink;
    ctx.fillRect(x, y, w, h);
  };

  // Cabeçalho: título e faixa.
  line(14, 14, size - 28, 3, 0.9);
  line(14, 24, 74, 5, 0.9);

  // Identidade: pares de rótulo curto e campo preenchido.
  for (let i = 0; i < 7; i++) {
    const y = 42 + i * 11;
    line(14, y, 30 + r() * 14, 2, 0.55);
    line(60, y + 1, 50 + r() * 46, 2, 0.8);
  }

  // Recursos, à direita: caixas de Vida, Sanidade, Energia, Mana, Oculto.
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const bx = size - 84 + (i % 2) * 40;
    const by = 40 + Math.floor(i / 2) * 34;
    ctx.strokeRect(bx, by, 34, 26);
    line(bx + 8, by + 10, 18, 7, 0.85);
  }

  // Perícias: a coluna longa que domina a página 2 da ficha.
  for (let i = 0; i < 22; i++) {
    const y = 132 + i * 5;
    line(16, y, 44 + r() * 18, 2, 0.5);
    line(90, y, 12, 2, 0.85);
  }

  // Inventário, embaixo à direita.
  ctx.globalAlpha = 0.6;
  ctx.strokeRect(size - 108, 130, 96, 60);
  for (let i = 0; i < 8; i++) line(size - 102, 138 + i * 7, 40 + r() * 40, 2, 0.5);

  // Vinco central: a ficha foi dobrada.
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000000';
  ctx.fillRect(size / 2 - 1, 0, 2, size);

  ctx.globalAlpha = 1;
  return toTexture(c, 1);
}

/**
 * O tapete de dados: feltro escuro com borda costurada.
 *
 * Ele existe por um motivo de FÍSICA, não de decoração. A simulação sempre teve
 * paredes invisíveis para os dados não escaparem; numa mesa de madeira lisa isso
 * seria mágica visível. O tapete com friso justifica a parede — e é o que existe
 * numa mesa de RPG de verdade.
 */
export function matTexture(size = 128): THREE.CanvasTexture {
  const [c, ctx] = canvas(size);
  const r = rng(0x7a9e);

  ctx.fillStyle = '#3a2440';
  ctx.fillRect(0, 0, size, size);

  // Grão do feltro.
  for (let i = 0; i < size * size * 0.34; i++) {
    ctx.globalAlpha = 0.05 + r() * 0.1;
    ctx.fillStyle = r() > 0.5 ? '#553359' : '#24142a';
    ctx.fillRect(Math.floor(r() * size), Math.floor(r() * size), 1, 1);
  }

  // Friso costurado, na cor de marca.
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#8d10e0';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(6.5, 6.5, size - 13, size - 13);
  ctx.setLineDash([]);

  ctx.globalAlpha = 1;
  return toTexture(c, 1);
}

/** Metal fosco do bocal da lâmpada e do fio. */
export function metalTexture(size = 32): THREE.CanvasTexture {
  const [c, ctx] = canvas(size);
  const r = rng(0x3311);
  ctx.fillStyle = '#2b2b30';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 3; i++) {
    ctx.globalAlpha = 0.1 + r() * 0.2;
    ctx.fillStyle = r() > 0.5 ? '#4a4a52' : '#17171b';
    ctx.fillRect(0, Math.floor(r() * size), size, 1);
  }
  ctx.globalAlpha = 1;
  return toTexture(c, 1);
}
