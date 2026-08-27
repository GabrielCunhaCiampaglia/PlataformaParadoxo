import * as THREE from 'three';
import type { DieSpec } from '@paradoxo/dice-3d';
import { DiceOnTable, type TableRollResult } from './dice-on-table.js';
import { RetroPipeline } from './ps1.js';
import { buildTable, type Hotspot, type TableParts } from './table.js';
import {
  BULB,
  SPOTS,
  layoutFor,
  resolveView,
  type Layout,
  type ViewName,
  type Viewpoint,
} from './viewpoints.js';

/**
 * A cena da mesa.
 *
 * CÂMERAS FIXAS, não primeira pessoa livre. A escolha vale por três motivos e o
 * terceiro é o decisivo:
 *
 *  1. navegar em primeira pessoa no toque é desconfortável;
 *  2. enquadramento fixo é a linguagem do survival horror da época, então a
 *     restrição vira estilo em vez de parecer limitação;
 *  3. o custo de desenhar cai muito: sem navegação livre, a cena é sempre uma
 *     de três, e o alvo interno pode ser pequeno.
 *
 * O laço roda continuamente enquanto a mesa está à vista — a lâmpada oscila, e
 * mesa parada lê como foto. Ele PARA nos dois lugares onde o jogador realmente
 * fica: com a ficha aberta e com a aba em segundo plano. Ver o comentário no
 * fim de `tick`.
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
  private layout: Layout = 'wide';
  private aspect = 1;
  private raf = 0;
  private disposed = false;
  private paused = false;
  private lastFrame = 0;
  private readonly rolling = new DiceOnTable();

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
    // Pixel ratio 1, sempre. A imagem já é definida pelo alvo interno; desenhar
    // o quad final em 2× ou 3× do dpr só gastaria fragmento à toa.
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 1);

    this.pipeline = new RetroPipeline(this.renderer);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.3, 24);
    this.scene.background = new THREE.Color(0x000000);

    this.parts = buildTable();
    // `buildTable` monta a mesa sem escolher disposição; sem esta chamada, a
    // ficha e o tapete ficariam na origem, empilhados um sobre o outro.
    this.parts.setLayout(this.layout);
    this.scene.add(this.parts.root);
    // Os dados da rolagem vivem num grupo próprio, sobre o tapete. Os dados
    // estáticos que a mesa monta são só o estado inicial — somem na primeira
    // rolagem de verdade.
    this.parts.root.add(this.rolling.group);
    this.placeRolling();
    this.baseIntensity = this.parts.lamp.intensity;

    // Ambiente quase nulo. O pouco que há existe só para o que está fora do
    // alcance da lâmpada não virar silhueta chapada — a mesa some no preto por
    // queda de luz, não por corte.
    this.scene.add(new THREE.AmbientLight(0x1e1626, 0.35));

    this.applyView(this.viewpoint(this.view));
    this.resize();
    this.start();
  }

  // --- enquadramento ---

  private viewpoint(name: ViewName): Viewpoint {
    return resolveView(this.layout, name, this.aspect);
  }

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
      to: this.viewpoint(view),
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
    this.applyView(this.viewpoint(view));
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

  /** Aba em segundo plano não desenha — e `rAF` nem dispararia. */
  private readonly onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else {
      this.wake();
    }
  };

  private start(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.wake();
  }

  // --- rolagem ---

  /**
   * Rola os dados SOBRE A MESA.
   *
   * A rolagem anterior fica onde parou até esta ser chamada — foi o pedido, e é
   * o que acontece numa mesa de verdade. `DiceOnTable.prepare` é quem limpa.
   */
  async roll(dice: DieSpec[], seed?: number): Promise<TableRollResult> {
    // Os dados estáticos que a mesa monta são só o estado inicial; a partir da
    // primeira rolagem de verdade, quem manda no tapete é a simulação.
    this.parts.dice.visible = false;

    const result = await this.rolling.prepare(dice, seed);
    this.wake();
    // Só devolve DEPOIS de o número aparecer. Quem chama mostra o total quando
    // esta promessa resolve, e não quando a simulação termina — senão o
    // resultado aparece na interface com o dado ainda no ar.
    await this.rolling.whenSettled();
    return result;
  }

  /** Mostra o resultado na hora, sem esperar a animação. */
  skipRoll(): void {
    this.rolling.finish();
    this.wake();
  }

  get isRolling(): boolean {
    return this.rolling.isPlaying;
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

    this.rolling.advance(32);
    this.flicker(now);
    this.pipeline.render(this.scene, this.camera);

    // O laço segue enquanto a mesa estiver à vista.
    //
    // A promessa original era desenhar SÓ durante o movimento da câmera. A
    // oscilação da lâmpada quebrou essa promessa, e vale dizer por quê em vez de
    // fingir que não: uma mesa parada lê como foto, e a cena inteira vive de
    // parecer um lugar. O que sustenta a decisão é o custo medido — 640 no lado
    // maior, uma luz, sem sombra dinâmica — e o fato de o laço PARAR nos dois
    // lugares onde o jogador realmente fica: com a ficha aberta e com a aba em
    // segundo plano.
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

    this.aspect = w / h;
    this.camera.aspect = this.aspect;

    // A MESA se reorganiza com a tela, não só a câmera. Num celular em pé, a
    // ficha e o tapete passam a ficar um atrás do outro — é o único eixo com
    // espaço sobrando ali. Ver `viewpoints.ts`.
    const layout = layoutFor(this.aspect);
    if (layout !== this.layout) {
      this.layout = layout;
      this.parts.setLayout(layout);
      this.placeRolling();
    }

    // Reaplica o enquadramento: tanto o `fov` quanto a disposição mudaram.
    this.applyView(this.viewpoint(this.view));
    this.wake();
  }

  private placeRolling(): void {
    const d = SPOTS[this.layout].dados;
    // 0,02 é a superfície do tapete: os dados caem SOBRE ele, não dentro.
    this.rolling.placeOn(d.x, 0.02, d.y);
  }

  get currentLayout(): Layout {
    return this.layout;
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
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.rolling.dispose();
    this.parts.dispose();
    this.pipeline.dispose();
    this.renderer.dispose();
  }
}
