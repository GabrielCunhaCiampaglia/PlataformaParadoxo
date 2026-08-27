import * as THREE from 'three';

/**
 * Onde ficam as coisas sobre a mesa, e de onde a câmera olha.
 *
 * As duas decisões moram juntas porque são uma só. E há uma terceira embutida: a
 * DISPOSIÇÃO muda com a proporção da tela.
 *
 * Numa tela larga, ficha e tapete ficam lado a lado — é o eixo que sobra. Num
 * celular em pé não sobra largura nenhuma: com 9:19,5 e 45° de campo vertical, o
 * campo horizontal dá menos de meio metro de mundo, e os dois objetos ficavam
 * cortados nas laterais. Afastar a câmera até caber deixaria a mesa minúscula, e
 * abrir o campo até caber exigiria 90°, com a distorção que vem junto.
 *
 * A saída é usar o eixo que o celular tem de sobra: em pé, ficha e tapete ficam
 * um atrás do outro, na PROFUNDIDADE. O enquadramento acompanha a tela em vez de
 * brigar com ela.
 */

/** Onde o bulbo pendura. */
export const BULB = new THREE.Vector3(0.05, 1.02, -0.1);

export type ViewName = 'mesa' | 'ficha' | 'dados';

/** `wide` = lado a lado; `tall` = um atrás do outro. */
export type Layout = 'wide' | 'tall';

/** Abaixo desta proporção (largura ÷ altura), a mesa se reorganiza. */
export const TALL_BELOW = 1.05;

export function layoutFor(aspect: number): Layout {
  return aspect < TALL_BELOW ? 'tall' : 'wide';
}

/** Centro de cada objeto sobre o tampo, por disposição. */
export const SPOTS: Record<Layout, Record<'ficha' | 'dados', THREE.Vector2>> = {
  // x, z
  wide: {
    ficha: new THREE.Vector2(-0.62, 0.06),
    dados: new THREE.Vector2(0.66, 0.0),
  },
  tall: {
    ficha: new THREE.Vector2(-0.03, -0.5),
    dados: new THREE.Vector2(0.02, 0.62),
  },
};

export interface Viewpoint {
  position: THREE.Vector3;
  target: THREE.Vector3;
  /** Campo de visão VERTICAL, em graus — a convenção do three.js. */
  fov: number;
}

/**
 * A conta que põe a lâmpada encostada no topo do quadro.
 *
 * Com 45° de campo vertical, meio campo são 22,5°. Para o bulbo ficar quase na
 * borda de cima, ele precisa estar a uns 21° acima do eixo da câmera. O eixo
 * aponta ~23° para baixo, então o bulbo acaba um pouco ABAIXO da altura do olho
 * — que é exatamente onde fica uma lâmpada pendurada baixa sobre uma mesa, para
 * quem está sentado. O enquadramento e a realidade concordam, e é por isso que
 * a imagem não parece um truque de câmera.
 */
export const VIEWS: Record<Layout, Record<ViewName, Viewpoint>> = {
  wide: {
    mesa: {
      position: new THREE.Vector3(0, 1.15, 2.35),
      target: new THREE.Vector3(0, 0.02, -0.12),
      fov: 45,
    },
    dados: {
      position: new THREE.Vector3(0.66, 1.28, 0.28),
      target: new THREE.Vector3(0.66, 0.01, 0.0),
      fov: 42,
    },
    ficha: {
      position: new THREE.Vector3(-0.62, 1.32, 0.8),
      target: new THREE.Vector3(-0.62, 0.0, 0.06),
      fov: 40,
    },
  },
  // Em pé, a câmera sobe e recua: os dois objetos estão distribuídos na
  // profundidade, e é altura de quadro que se precisa, não largura.
  tall: {
    mesa: {
      position: new THREE.Vector3(0, 1.62, 2.15),
      target: new THREE.Vector3(0, 0.02, 0.1),
      fov: 54,
    },
    dados: {
      position: new THREE.Vector3(0.02, 1.12, 0.86),
      target: new THREE.Vector3(0.02, 0.01, 0.62),
      fov: 46,
    },
    ficha: {
      position: new THREE.Vector3(-0.03, 1.24, -0.24),
      target: new THREE.Vector3(-0.03, 0.0, -0.5),
      fov: 44,
    },
  },
};

/** Meias-medidas dos objetos sobre a mesa. */
export const SIZES = {
  ficha: { halfX: 0.31, halfZ: 0.43 },
  dados: { halfX: 0.47, halfZ: 0.38 },
};

/** O que cada vista é obrigada a mostrar por inteiro. */
function mustShow(layout: Layout, name: ViewName): THREE.Vector3[] {
  const alvos = name === 'mesa' ? (['ficha', 'dados'] as const) : ([name] as const);
  return alvos.flatMap((k) => cornersOf(SPOTS[layout][k], SIZES[k], 0.02));
}

/**
 * A vista já ajustada à proporção da tela.
 *
 * O campo de visão do three.js é VERTICAL: numa tela estreita o campo horizontal
 * encolhe junto, e o que estava nas laterais some. Um número fixo de `fov` por
 * vista é, portanto, corte garantido em alguma tela — foi assim que a ficha e o
 * tapete saíram cortados no celular.
 *
 * A conta é feita sobre os CANTOS de verdade, em espaço de câmera, e não sobre
 * uma largura medida na distância do alvo. A diferença não é sutileza: o tapete
 * fica mais PERTO da câmera do que o ponto para onde ela olha, e por isso se
 * espalha mais em ângulo. Medindo na distância do alvo, a conta dava folga onde
 * não havia, e o canto continuava fora do quadro.
 *
 * O `fov` da vista é o mínimo. Em tela larga nada muda, e é por isso que a
 * função pode ser aplicada sempre, sem caso especial.
 */
export function resolveView(layout: Layout, name: ViewName, aspect: number): Viewpoint {
  const base = VIEWS[layout][name];

  const cam = new THREE.PerspectiveCamera(base.fov, aspect, 0.3, 24);
  cam.position.copy(base.position);
  cam.lookAt(base.target);
  cam.updateMatrixWorld(true);

  // tan(fov/2) mínimo para o canto caber, em cada eixo:
  //   |x| / (aspect · z) na horizontal, |y| / z na vertical.
  let tan = Math.tan((base.fov * Math.PI) / 360);
  for (const p of mustShow(layout, name)) {
    const v = p.clone().applyMatrix4(cam.matrixWorldInverse);
    const z = -v.z;
    if (z <= 0.01) continue;
    tan = Math.max(tan, Math.abs(v.x) / (aspect * z), Math.abs(v.y) / z);
  }

  // 8% de folga: o canto encostado na borda ainda lê como cortado.
  const fov = (2 * Math.atan(tan * 1.08) * 180) / Math.PI;
  return { ...base, fov };
}

/**
 * Onde um ponto do mundo cai no quadro, em coordenadas de −1 a 1.
 *
 * `y = 1` é a borda de cima, `y = -1` a de baixo. Fora dessa faixa, o ponto não
 * aparece. É a função que permite AFIRMAR em teste que a lâmpada está no quadro
 * mas encostada no topo, e que nada foi cortado — em vez de conferir isso a olho
 * numa captura, que foi como o corte no celular passou despercebido.
 */
export function projectToFrame(
  view: Viewpoint,
  point: THREE.Vector3,
  aspect: number,
): THREE.Vector2 {
  const camera = new THREE.PerspectiveCamera(view.fov, aspect, 0.3, 24);
  camera.position.copy(view.position);
  camera.lookAt(view.target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const ndc = point.clone().project(camera);
  return new THREE.Vector2(ndc.x, ndc.y);
}

/** Os quatro cantos de um objeto, no mundo. */
export function cornersOf(
  spot: THREE.Vector2,
  size: { halfX: number; halfZ: number },
  y: number,
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.push(new THREE.Vector3(spot.x + sx * size.halfX, y, spot.y + sz * size.halfZ));
    }
  }
  return out;
}
