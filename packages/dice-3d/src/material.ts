import * as THREE from 'three';

/**
 * O material que pinta o número na face do dado.
 *
 * Extraído do renderer para que a MESA possa usar o mesmo shader. Sem isto, a
 * cena 3D teria de reimplementar a revelação inteira — o crescimento do dígito,
 * o brilho passageiro, a atenuação das faces que não são a de cima — e as duas
 * cópias divergiriam no primeiro ajuste. Cada linha aqui existe por causa de um
 * defeito específico, e nenhuma delas é óbvia o bastante para sobreviver a uma
 * segunda escrita.
 *
 * O material BASE é do chamador. A rolagem em tela cheia usa `MeshStandard`, com
 * o brilho que o momento pede; a mesa usa `MeshLambert` com o shader de época,
 * para os dados não parecerem colados de outro jogo.
 */

export interface DiceUniforms {
  /** 0 = face em branco, 1 = número pleno. */
  uReveal: { value: number };
  /** Brilho passageiro no instante em que o número surge. */
  uFlash: { value: number };
  /** Lado do atlas em células — o shader precisa dele para achar a célula. */
  uCols: { value: number };
  /** Face que assentou. Negativo desliga a atenuação das outras. */
  uTopFace: { value: number };
  uNumberMap: { value: THREE.Texture | null };
}

export type UniformName = keyof DiceUniforms;

type WithUniforms = THREE.Material & {
  userData: { diceUniforms?: DiceUniforms };
};

/**
 * Instala o shader de numeração num material qualquer do three.js.
 *
 * Devolve os uniforms. Guarde-os: alterar `.value` neles é a única forma
 * confiável de mexer no material depois — ver o comentário abaixo.
 */
export function applyDiceNumbering(material: THREE.Material): DiceUniforms {
  // Sem isto o shader NÃO COMPILA e o dado some da tela — só a sombra aparece.
  // O three.js só declara o varying `vUv` quando o material tem algum mapa; como
  // a textura dos números entra por uniform próprio, é preciso pedir o varying
  // explicitamente.
  material.defines = { ...(material.defines ?? {}), USE_UV: '' };

  // Uniforms mantidos AQUI, fora do shader.
  //
  // A versão anterior lia `userData.shader.uniforms` depois da compilação, e
  // isso falhava de forma intermitente: com uma cacheKey de programa constante,
  // o three.js reaproveita o programa já compilado e NÃO chama `onBeforeCompile`
  // de novo. Do segundo dado em diante — e em toda rolagem após a primeira — a
  // textura de números ficava nula e o dado saía em branco. Guardando a
  // referência aos objetos de uniform, basta alterar `.value`, tenha o shader
  // sido recompilado ou não.
  const uniforms: DiceUniforms = {
    uReveal: { value: 0 },
    uFlash: { value: 0 },
    uCols: { value: 1 },
    uTopFace: { value: -1 },
    uNumberMap: { value: null },
  };
  (material as WithUniforms).userData.diceUniforms = uniforms;

  // A revelação, no shader.
  //
  // Antes era só a opacidade do número subindo de 0 a 1 — lê como imagem
  // carregando, não como resultado sendo revelado. Agora são três coisas ao
  // mesmo tempo: o dígito CRESCE até assentar no tamanho certo, a opacidade
  // entra atrás dele, e um brilho passa e some.
  //
  // A escala é feita amostrando a UV mais perto do centro da PRÓPRIA célula —
  // por isso o `uCols`. O fator vai de 0,72 a 1,0, nunca acima: passar de 1
  // sairia da célula e puxaria o número da face vizinha para dentro desta.
  // ENCADEIA em vez de atribuir.
  //
  // `onBeforeCompile` é um campo, não uma lista: quem atribui por último apaga
  // quem veio antes, em silêncio, e o shader do outro simplesmente não existe.
  // Foi o que aconteceu quando a mesa somou o jitter de vértice a este material
  // — os dados rolaram perfeitamente e saíram sem número nenhum.
  const anterior = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    anterior?.call(material, shader, renderer);
    shader.uniforms.uReveal = uniforms.uReveal;
    shader.uniforms.uFlash = uniforms.uFlash;
    shader.uniforms.uCols = uniforms.uCols;
    shader.uniforms.uTopFace = uniforms.uTopFace;
    shader.uniforms.uNumberMap = uniforms.uNumberMap;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uReveal;
         uniform float uFlash;
         uniform float uCols;
         uniform float uTopFace;
         uniform sampler2D uNumberMap;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         vec2 cellIdx = floor(vUv * uCols);
         vec2 cellCenter = (cellIdx + 0.5) / uCols;
         float grow = mix(0.72, 1.0, uReveal);
         vec2 numUv = cellCenter + (vUv - cellCenter) * grow;
         vec4 numTex = texture2D(uNumberMap, numUv);

         // Qual face é esta célula. A linha é invertida porque a textura tem
         // flipY — a mesma inversão que a UV faz em geometry.ts.
         float faceIdx = (uCols - 1.0 - cellIdx.y) * uCols + cellIdx.x;
         // uTopFace < 0 significa "não atenue nada": é o caso do d4, cujo
         // destaque já vem resolvido no atlas, canto a canto.
         float isTop = max(step(uTopFace, -0.5), step(abs(faceIdx - uTopFace), 0.5));

         // As outras faces ficam com o número fantasma. Um dado real também tem
         // número nos lados, mas eles não competem com o de cima; aqui
         // competiam, e não dava para saber qual era o resultado.
         float a = numTex.a * uReveal * mix(0.26, 1.0, isTop);
         diffuseColor.rgb = mix(diffuseColor.rgb, numTex.rgb, a);
         totalEmissiveRadiance += numTex.rgb * a * isTop * (0.35 + uFlash * 2.4);`,
      );
  };

  // Sem customProgramCacheKey: o three.js chama onBeforeCompile ANTES de decidir
  // se reaproveita o programa, então os uniforms são sempre ligados. Uma chave
  // constante fazia o hook ser pulado; uma chave única forçava recompilação
  // desnecessária.
  return uniforms;
}

/** Altera um uniform de um material já preparado. Silencioso se não houver. */
export function setDiceUniform(
  material: THREE.Material,
  name: UniformName,
  value: number | THREE.Texture | null,
): void {
  const u = (material as WithUniforms).userData.diceUniforms;
  if (!u) return;
  if (name === 'uNumberMap') u.uNumberMap.value = value as THREE.Texture | null;
  else u[name].value = value as number;
}

/** O material padrão da rolagem em tela cheia. */
export function createDiceMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x241d33,
    roughness: 0.28,
    metalness: 0.32,
    emissive: 0x8d10e0,
    emissiveIntensity: 0.06,
  });
  applyDiceNumbering(mat);
  return mat;
}
