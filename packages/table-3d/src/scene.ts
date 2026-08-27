import * as THREE from 'three';
import { RetroPipeline } from './ps1.js';
import { buildTable, type Hotspot, type TableParts } from './table.js';
import { BULB, VIEWS, type ViewName, type Viewpoint } from './viewpoints.js';

/**
 * A cena da mesa.
 *
 * CÂMERAS FIXAS, não primeira pessoa livre. A escolha vale por três motivos e o
 * terceiro é o decisivo:
 *
 *  1. navegar em primeira pessoa no toque é desconfortável;
 *  2. enquadramento fixo é a linguagem do survival horror da época, então a
 *     restrição vira estilo em vez de parecer limitação;
 *  3. a cena só precisa desenhar ENQUANTO a câmera se move. Parada, o último
 *     quadro serve. É a diferença entre horas de GPU e segundos numa sessão.
 */

export interface SceneOptions {
  /** Chamado quando o jogador toca uma região da mesa. */
  onPick?: (spot: Hotspot) => void;
  /** Chamado quando uma transição de câmera termina. */
  onArrive?: (view: ViewName) => void;
}

export class TableScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly pipeline: RetroPipeline;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly parts: TableParts;
  private readonly raycaster = new THREE.Raycaster();

  private view: ViewName = 'mesa';
  private raf = 0;
  private disposed = false;
  private paused = false;
  private lastFrame = 0;

  /** Transição em curso, se houver. */
  private tween: {
    from: Viewpoint;
    to: Viewpoint;
    started: number;
    ms: number;
    view: ViewName;
  } | null = null;

  private readonly target = new THREE.Vector3();
  private readonly baseIntensity: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opts: SceneOptions = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    // Pixel ratio 1, sempre. Ampliar 320×240 com NEAREST já define a imagem;
    // desenhar o quad final em 2× ou 3× só gastaria fragmento à toa.
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 1);

    this.pipeline = new RetroPipeline(this.renderer);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.3, 24);
    this.scene.background = new THREE.Color(0x000000);

    this.parts = buildTable();
    this.scene.add(this.parts.root);
    this.baseIntensity = this.parts.lamp.intensity;

    // Ambiente quase nulo. O pouco que há existe só para o que está fora do
    // alcance da lâmpada não virar silhueta chapada — a mesa some no preto por
    // queda de luz, não por corte.
    this.scene.add(new THREE.AmbientLight(0x1e1626, 0.35));

    this.applyView(VIEWS[this.view]);
    this.resize();
    this.start();
  }

  // --- enquadramento ---

  private applyView(v: Viewpoint): void {
    this.camera.position.copy(v.position);
    this.target.copy(v.target);
    this.camera.fov = v.fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.target);
  }

  /** Move a câmera até um ponto de vista. */
  goTo(view: ViewName, ms = 620): void {
    if (view === this.view && !this.tween) return;
    this.tween = {
      from: {
        position: this.camera.position.clone(),
        target: this.target.clone(),
        fov: this.camera.fov,
      },
      to: VIEWS[view],
      started: performance.now(),
      ms,
      view,
    };
    this.wake();
  }

  /**
   * Vai direto para um ponto de vista, sem transição.
   *
   * Usado para restaurar o enquadramento ao voltar para a mesa, e pelas
   * verificações visuais — que rodam num contexto onde `requestAnimationFrame`
   * não dispara, e portanto onde nenhuma transição avançaria.
   */
  jumpTo(view: ViewName): void {
    this.tween = null;
    this.view = view;
    this.applyView(VIEWS[view]);
    this.wake();
  }

  get currentView(): ViewName {
    return this.view;
  }

  // --- seleção ---

  /** Converte um toque em região da mesa. Coordenadas em pixels de CSS. */
  pick(clientX: number, clientY: number): Hotspot | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);

    const targets = [...this.parts.pickable.values()];
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;

    for (const [spot, obj] of this.parts.pickable) {
      if (obj === hit.object) return spot;
    }
    return null;
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    const spot = this.pick(e.clientX, e.clientY);
    if (!spot) return;
    this.opts.onPick?.(spot);
    this.goTo(spot);
  };

  // --- laço ---

  /**
   * Pausa o desenho. É o que a ficha aberta faz.
   *
   * Enquanto o jogador lê a ficha — que é onde ele passa a maior parte do tempo
   * — a cena 3D custa ZERO. O último quadro fica no canvas, atrás do HTML.
   */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) this.wake();
  }

  private wake(): void {
    if (this.raf || this.disposed || this.paused) return;
    this.lastFrame = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  private start(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.wake();
  }

  private readonly tick = (now: number) => {
    this.raf = 0;
    if (this.disposed || this.paused) return;

    // Teto de 30 quadros por segundo. A referência rodava perto disso, então o
    // limite é fiel — e corta metade do trabalho num aparelho de 60 Hz.
    if (now - this.lastFrame < 32) {
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    this.lastFrame = now;

    if (this.tween) {
      const t = Math.min(1, (now - this.tween.started) / this.tween.ms);
      // easeInOutCubic: a câmera sai e chega devagar, como cabeça que se
      // inclina. Linear lê como corte de software.
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.tween.from.position, this.tween.to.position, e);
      this.target.lerpVectors(this.tween.from.target, this.tween.to.target, e);
      this.camera.fov = this.tween.from.fov + (this.tween.to.fov - this.tween.from.fov) * e;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.target);

      if (t >= 1) {
        this.view = this.tween.view;
        const arrived = this.tween.view;
        this.tween = null;
        this.opts.onArrive?.(arrived);
      }
    }

    this.flicker(now);
    this.pipeline.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  };

  /**
   * A lâmpada oscila de leve.
   *
   * Duas senoides incomensuráveis: o padrão nunca se repete de forma audível
   * para o olho, e a mesa nunca fica totalmente parada. É o que separa a cena de
   * uma foto — e custa duas multiplicações por quadro.
   */
  private flicker(now: number): void {
    const t = now / 1000;
    const wobble = Math.sin(t * 2.3) * 0.06 + Math.sin(t * 7.9) * 0.025;
    this.parts.lamp.intensity = this.baseIntensity * (1 + wobble);
    this.parts.bulb.position.x = BULB.x + Math.sin(t * 0.7) * 0.004;
  }

  // --- ciclo de vida ---

  resize(): void {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.pipeline.resize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.wake();
  }

  /** Resolução interna em uso — para a verificação de que o alvo está baixo. */
  get internalSize(): { width: number; height: number } {
    return { width: this.pipeline.width, height: this.pipeline.height };
  }

  /** Desenha um quadro agora. Existe para medir o custo sem o PNG no meio. */
  renderOnce(): void {
    this.pipeline.render(this.scene, this.camera);
  }

  /** Captura o quadro atual. Usado nas verificações visuais. */
  snapshot(): string {
    this.pipeline.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.parts.dispose();
    this.pipeline.dispose();
    this.renderer.dispose();
  }
}
