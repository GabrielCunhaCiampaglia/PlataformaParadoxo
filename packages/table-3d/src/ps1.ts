import * as THREE from 'three';

/**
 * O look PS1 — e por que ele é a decisão de PERFORMANCE, não um custo dela.
 *
 * A preocupação com celular vinha de uma cena 3D persistente custar bateria. Só
 * que cada traço desta estética remove exatamente um dos itens caros:
 *
 *  | moderno                         | aqui                              |
 *  |---------------------------------|-----------------------------------|
 *  | PBR por fragmento               | Lambert, uma luz                  |
 *  | shadow map 1024² todo quadro    | nenhuma sombra dinâmica           |
 *  | texturas de MB                  | 256 px desenhados em canvas       |
 *  | renderiza a 1,75× o dpr         | renderiza a 640 no lado maior     |
 *
 * A última linha é a que decide: o custo de fragmento cai ~4×.
 *
 * A referência é N64, não PS1 — a primeira versão em 320×240 saiu pixelada demais.
 * O que muda com isso: mais resolução, textura FILTRADA em vez de serrilhada, e
 * quantização de cor mais leve. O jitter de vértice fica, mas fino.
 */

/**
 * Resolução interna: 640 no lado MAIOR.
 *
 * A primeira versão fixava a ALTURA em 240, à la PS1. Ficou pixelado demais, e
 * fixar a altura ainda tinha um segundo defeito: num celular em pé, 240 de
 * altura dá 110 de largura, e a imagem virava sopa. Limitando o lado maior, o
 * orçamento de pixels é o mesmo deitado ou em pé.
 *
 * 640 é a saída da referência — N64, não PS1. Numa tela de 1280×720 são 230 mil
 * pixels contra 921 mil nativos: ainda 4× menos trabalho de fragmento.
 */
export const INTERNAL_LONG = 640;

/**
 * Trava os vértices numa grade, em espaço de tela.
 *
 * O PS1 não tinha unidade de ponto flutuante na transformação de vértices: ele
 * arredondava para coordenadas inteiras de tela. Daí o tremido dos polígonos
 * quando a câmera anda, que é a assinatura mais reconhecível do console.
 *
 * Cabe em três linhas de vertex shader e não custa nada.
 */
export function applyPS1(material: THREE.Material, jitter = 320): void {
  // ENCADEIA. Ver o comentário gêmeo em `material.ts` do dice-3d: atribuir
  // direto apagaria o shader de numeração dos dados, sem erro nenhum.
  const anterior = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    anterior?.call(material, shader, renderer);
    shader.uniforms.uJitter = { value: jitter };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n uniform float uJitter;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         // A divisão por w leva a coordenada normalizada de tela; arredondar
         // ali e multiplicar de volta é o snap do console.
         vec2 grid = vec2(uJitter, uJitter * 0.75);
         gl_Position.xy = floor((gl_Position.xy / gl_Position.w) * grid) / grid * gl_Position.w;`,
      );
  };
  material.needsUpdate = true;
}

const COMPOSITE_FRAGMENT = /* glsl */ `
  uniform sampler2D uScene;
  uniform vec2 uOutputSize;
  varying vec2 vUv;

  // Bayer 4×4 — a matriz de dither clássica.
  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = y * 4 + x;
    float m[16];
    m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
    m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
    m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
    m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
    for (int k = 0; k < 16; k++) { if (k == i) return m[k] / 16.0 - 0.5; }
    return 0.0;
  }

  void main() {
    vec3 c = texture2D(uScene, vUv).rgb;

    // Quantização de cor, mas mais leve que a de 15 bits do PS1: 64 níveis por
    // canal em vez de 32. A referência do cliente é N64, onde o degradê é mais
    // limpo — com 32 níveis o chuvisco do dither competia com a textura.
    float levels = 64.0;
    c += bayer(gl_FragCoord.xy) / levels;
    c = floor(c * levels + 0.5) / levels;

    gl_FragColor = vec4(c, 1.0);
  }
`;

/**
 * Renderiza numa resolução baixa e amplia com NEAREST.
 *
 * A ampliação é um quad de tela cheia com a textura do alvo — é ali que entram a
 * quantização de cor e o dither, de uma vez para a cena inteira.
 */
export class RetroPipeline {
  private readonly target: THREE.WebGLRenderTarget;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.target = new THREE.WebGLRenderTarget(640, 360, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      // Sem stencil e sem mipmap: nada aqui precisa deles.
      stencilBuffer: false,
      generateMipmaps: false,
    });
    this.target.texture.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: this.target.texture },
        uOutputSize: { value: new THREE.Vector2(640, 360) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: COMPOSITE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }

  /** Redimensiona o alvo interno mantendo a proporção da tela. */
  resize(cssWidth: number, cssHeight: number): void {
    const w0 = Math.max(1, cssWidth);
    const h0 = Math.max(1, cssHeight);
    const k = INTERNAL_LONG / Math.max(w0, h0);
    const w = Math.max(200, Math.round(w0 * k));
    const h = Math.max(200, Math.round(h0 * k));
    this.target.setSize(w, h);
    this.material.uniforms.uOutputSize!.value.set(w, h);
  }

  get width(): number {
    return this.target.width;
  }
  get height(): number {
    return this.target.height;
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.setRenderTarget(this.target);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
  }
}
