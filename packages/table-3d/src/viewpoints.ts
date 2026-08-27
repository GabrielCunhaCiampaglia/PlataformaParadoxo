import * as THREE from 'three';

/**
 * Onde a câmera pode estar, e onde a lâmpada pendura.
 *
 * As duas coisas moram no mesmo arquivo porque são a MESMA decisão. O pedido era
 * que a lâmpada "mal aparecesse", e isso não se resolve movendo a lâmpada nem
 * movendo a câmera — resolve-se com as duas de acordo. Separá-las em arquivos
 * diferentes é o caminho mais curto para alguém ajustar uma e quebrar a outra.
 *
 * Sem DOM aqui: é geometria pura, e por isso dá para testar sem navegador.
 */

/** Onde o bulbo pendura. */
export const BULB = new THREE.Vector3(0.05, 1.02, -0.1);

export type ViewName = 'mesa' | 'ficha' | 'dados';

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
export const VIEWS: Record<ViewName, Viewpoint> = {
  mesa: {
    position: new THREE.Vector3(0, 1.15, 2.35),
    target: new THREE.Vector3(0, 0.02, -0.12),
    fov: 45,
  },
  // De cima do tapete, no mesmo ângulo que a rolagem já usa — assim a passagem
  // para o módulo de dados não tem costura.
  dados: {
    position: new THREE.Vector3(0.66, 1.28, 0.28),
    target: new THREE.Vector3(0.66, 0.01, 0.0),
    fov: 42,
  },
  // Sobre o papel. O texto de verdade é HTML e entra por cima quando a câmera
  // chega; aqui só se decide o enquadramento de destino.
  ficha: {
    position: new THREE.Vector3(-0.62, 1.32, 0.8),
    target: new THREE.Vector3(-0.62, 0.0, 0.06),
    fov: 40,
  },
};

/**
 * Onde um ponto do mundo cai no quadro, em coordenadas de −1 a 1.
 *
 * `y = 1` é a borda de cima, `y = -1` a de baixo. Fora dessa faixa, o ponto não
 * aparece. É a função que permite afirmar em teste que a lâmpada está no quadro
 * mas encostada no topo, em vez de conferir isso a olho numa captura.
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
