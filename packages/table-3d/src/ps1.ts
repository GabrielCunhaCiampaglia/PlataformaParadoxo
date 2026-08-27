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
 *  | texturas de MB                  | 128 px desenhados em canvas       |
 *  | renderiza a 1,75× o dpr         | renderiza a 320×240 e amplia      |
 *
 * A última linha é a que decide: o custo de fragmento cai entre 5 e 10 vezes,
 * conforme o tamanho da tela. E o serrilhado que sobra não é defeito a esconder,
 * é o efeito pedido.
 */

/** Resolução interna. 320×240 era a saída típica do console. */
export const INTERNAL_HEIGHT = 240;

/**
 * Trava os vértices numa grade, em espaço de tela.
 *
 * O PS1 não tinha unidade de ponto flutuante na transformação de vértices: ele
 * arredondava para coordenadas inteiras de tela. Daí o tremido dos polígonos
 * quando a câmera anda, que é a assinatura mais reconhecível do console.
 *
 * Cabe em três linhas de vertex shader e não custa nada.
 */
export function applyPS1(material: THREE.Material, jitter = 160): void {
  material.onBeforeCompile = (shader) => {
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

    // Cor de 15 bits: 32 níveis por canal, como o framebuffer do console. Sem o
    // dither, o degradê da luz sobre a mesa vira faixa lisa; com ele, vira o
    // chuvisco de pontos que a memória associa àquela época.
    float levels = 32.0;
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
    this.target = new THREE.WebGLRenderTarget(320, INTERNAL_HEIGHT, {
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
        uOutputSize: { value: new THREE.Vector2(320, INTERNAL_HEIGHT) },
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
    const aspect = cssWidth / Math.max(1, cssHeight);
    const h = INTERNAL_HEIGHT;
    const w = Math.max(160, Math.round(h * aspect));
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
