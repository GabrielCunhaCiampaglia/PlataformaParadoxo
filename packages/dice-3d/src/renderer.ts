import * as THREE from 'three';
import { buildDiceGeometry, circumradius } from './geometry.js';
import { labelFaces, splitPercentile } from './label.js';
import { POLYHEDRA } from './polyhedra.js';
import { simulate, trayHalfFor, type DieFrame } from './simulate.js';
import { buildNumberAtlas } from './texture.js';

/**
 * Renderer da rolagem 3D.
 *
 * Fluxo (ADR-0010):
 *   1. o motor de regras já decidiu o número
 *   2. a física roda HEADLESS e devolve uma gravação
 *   3. lê-se qual face assentou e ATRIBUI-SE a numeração
 *   4. reproduz-se a gravação — dados com as faces em branco
 *   5. ao assentar, o número faz FADE-IN na face
 *
 * Renderização SOB DEMANDA: nada é desenhado fora da rolagem. Numa sessão de
 * 4 h com 100 rolagens são ~2 min de GPU, não 4 h (doc 08 §5).
 */

const STEP_MS = 1000 / 60;

/** Direção de onde a câmera olha — precisa casar com `applyCamera`. */
const VIEW_DIR = [0, 0.978, 0.208] as const;

type DiceUniforms = {
  uReveal: { value: number };
  uNumberMap: { value: THREE.Texture | null };
};

type MaterialWithUniforms = THREE.MeshStandardMaterial & {
  userData: { diceUniforms?: DiceUniforms };
};

export interface DieSpec {
  /** Id do catálogo: 'd4' | 'd6' | 'd8' | 'd10' | 'd20'. */
  id: string;
  /** Valor que o motor decidiu para este dado. */
  value: number;
  role?: 'tens' | 'units';
}

export interface RollOptions {
  dice: DieSpec[];
  /** Semente, para reprodutibilidade em teste. */
  seed?: number;
  /** Multiplica a velocidade da reprodução. 2 = metade do tempo. */
  speed?: number;
  onSettled?: () => void;
  /**
   * Numera TODAS as faces, e não só a que assentou.
   *
   * Opção 2 do doc 08 §3.2: mais crível se houver câmera livre, ao custo de o
   * jogador ver vários números e precisar identificar qual é o resultado.
   */
  numberAllFaces?: boolean;
}

interface DieInstance {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  frames: DieFrame[];
  reveal: { value: number };
}

export interface RendererDiagnostics {
  /** Quantas simulações foram descartadas antes de uma válida. */
  retries: number;
  simMs: number;
  /** Posições finais, para conferir contenção no tray. */
  restPositions: Array<[number, number, number]>;
  trayHalf: number;
  /** Todos os dados ficaram dentro do tray? */
  contained: boolean;
  /** Todos ficaram visíveis no enquadramento da câmera? */
  onScreen: boolean;
  settleMs: number;
  /** Índice da face que assentou, por dado — usado na verificação visual. */
  topFaces: number[];
  /** Número que cada dado deve mostrar. */
  values: number[];
}

export class DiceRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly group = new THREE.Group();
  private dice: DieInstance[] = [];
  private raf = 0;
  private disposed = false;
  private trayHalf = 3.2;
  private floor?: THREE.Mesh;

  /** Diagnóstico da última rolagem — usado pelos testes de interface. */
  lastDiagnostics: RendererDiagnostics | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    // Teto de 2: acima disso é bateria gasta sem ganho visível num celular.
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.scene.add(this.group);
    this.setupLights();
    this.setupFloor();
    this.resize();
  }

  private setupLights(): void {
    // Ambiente frio e baixo: o dado precisa ler como objeto escuro, não cinza.
    this.scene.add(new THREE.HemisphereLight(0x8899bb, 0x0a0812, 0.55));

    const key = new THREE.DirectionalLight(0xfff4e8, 2.8);
    // Quase sobre a cena: a sombra cai SOB o dado em vez de ao lado dele.
    key.position.set(0.9, 12, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    const s = 8;
    key.shadow.camera.left = -s;
    key.shadow.camera.right = s;
    key.shadow.camera.top = s;
    key.shadow.camera.bottom = -s;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    // Rim light violeta: a cor de marca aparece no contorno, não na face.
    const rim = new THREE.DirectionalLight(0x8d10e0, 1.6);
    rim.position.set(-6, 3, -4);
    this.scene.add(rim);

    const fill = new THREE.DirectionalLight(0x4a6fa5, 0.7);
    fill.position.set(-3, 4, 6);
    this.scene.add(fill);
  }

  private setupFloor(): void {
    // Só recebe sombra — o fundo do app aparece através dele.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.ShadowMaterial({ opacity: 0.3, color: 0x05040a }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floor = floor;
  }

  /** Centro para onde a câmera olha, e raio a enquadrar. */
  private target = new THREE.Vector3(0, 0, 0);
  private frameRadius = 3.2;

  /**
   * Enquadra o tray inteiro. Usado antes de saber onde os dados vão parar.
   */
  private frameCamera(trayHalf: number): void {
    this.trayHalf = trayHalf;
    this.frameRadius = trayHalf * 1.12;
    this.target.set(0, 0, 0);
    this.applyCamera();
  }

  /**
   * Enquadra ONDE OS DADOS PARARAM, não o tray inteiro.
   *
   * Como os dados são arremessados da frente, eles assentam no fundo do tray —
   * enquadrar o tray deixava metade do quadro vazio e os dados espremidos no
   * topo da tela. Mirar no grupo de dados os traz para o centro e permite
   * chegar bem mais perto.
   */
  private frameToDice(positions: Array<[number, number, number]>, dieRadius: number): void {
    if (positions.length === 0) return;

    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const [x, y, z] of positions) {
      min.min(new THREE.Vector3(x, y, z));
      max.max(new THREE.Vector3(x, y, z));
    }
    this.target.copy(min).add(max).multiplyScalar(0.5);
    // Mira um pouco acima do chão, na altura do corpo do dado.
    this.target.y = dieRadius * 0.35;

    // Raio que cobre o grupo inteiro, mais o corpo do dado e uma margem
    // pequena para o resultado não encostar na borda.
    const spread = min.distanceTo(max) / 2;
    this.frameRadius = spread + dieRadius * 1.32;
    this.applyCamera();
  }

  private applyCamera(): void {
    const fov = (this.camera.fov * Math.PI) / 180;
    // Em retrato o gargalo é a horizontal: converte para o fov horizontal.
    const fovH = 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect);
    const dist = this.frameRadius / Math.sin(Math.min(fov, fovH) / 2);

    // ~78° de elevação. A face superior é ONDE ESTÁ O RESULTADO e precisa ser
    // lida de frente; a 68° ela saía comprimida na borda de cima do dado. O Z
    // residual é o que ainda dá volume ao sólido e evita a leitura chapada.
    this.camera.position.set(
      this.target.x,
      this.target.y + dist * 0.978,
      this.target.z + dist * 0.208,
    );
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }

  resize(): void {
    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyCamera();
    this.renderOnce();
  }

  private makeMaterial(): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x241d33,
      roughness: 0.28,
      metalness: 0.32,
      emissive: 0x8d10e0,
      emissiveIntensity: 0.06,
    });

    // Sem isto o shader NÃO COMPILA e o dado some da tela — só a sombra
    // aparece. O three.js só declara o varying `vUv` quando o material tem
    // algum mapa; como a textura dos números entra por uniform próprio, é
    // preciso pedir o varying explicitamente.
    mat.defines = { ...(mat.defines ?? {}), USE_UV: '' };

    // Uniforms mantidos AQUI, não dentro do shader.
    //
    // A versão anterior lia `userData.shader.uniforms` depois da compilação, e
    // isso falhava de forma intermitente: com uma cacheKey de programa
    // constante, o three.js reaproveita o programa já compilado e NÃO chama
    // `onBeforeCompile` de novo. Do segundo dado em diante — e em toda rolagem
    // após a primeira — a textura de números ficava nula e o dado saía em
    // branco. Guardando a referência aos objetos de uniform, basta alterar
    // `.value`, independentemente de o shader ter sido recompilado ou não.
    const uniforms = {
      uReveal: { value: 0 },
      uNumberMap: { value: null as THREE.Texture | null },
    };
    (mat as MaterialWithUniforms).userData.diceUniforms = uniforms;

    // `uReveal` mistura o número por cima da cor do dado. Em 0 a face está em
    // branco; em 1 o número está pleno. É o fade da revelação.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uReveal = uniforms.uReveal;
      shader.uniforms.uNumberMap = uniforms.uNumberMap;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uReveal;
           uniform sampler2D uNumberMap;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           vec4 numTex = texture2D(uNumberMap, vUv);
           float a = numTex.a * uReveal;
           diffuseColor.rgb = mix(diffuseColor.rgb, numTex.rgb, a);
           totalEmissiveRadiance += numTex.rgb * a * 0.55;`,
        );
    };
    // Sem customProgramCacheKey: o three.js chama onBeforeCompile ANTES de
    // decidir se reaproveita o programa, então os uniforms são sempre ligados.
    // Uma chave constante fazia o hook ser pulado; uma chave única forçava
    // recompilação desnecessária.
    return mat;
  }

  private setUniform(mat: THREE.MeshStandardMaterial, name: 'uReveal' | 'uNumberMap', value: unknown): void {
    const u = (mat as MaterialWithUniforms).userData.diceUniforms;
    if (!u) return;
    if (name === 'uReveal') u.uReveal.value = value as number;
    else u.uNumberMap.value = value as THREE.Texture | null;
  }

  private clearDice(): void {
    for (const d of this.dice) {
      this.group.remove(d.mesh);
      d.mesh.geometry.dispose();
      const map = (d.material as MaterialWithUniforms).userData.diceUniforms?.uNumberMap.value;
      map?.dispose();
      d.material.dispose();
    }
    this.dice = [];
  }

  private renderOnce(): void {
    if (!this.disposed) this.renderer.render(this.scene, this.camera);
  }

  /**
   * Roda a rolagem. Resolve quando os números terminam de aparecer.
   */
  async roll(opts: RollOptions): Promise<RendererDiagnostics> {
    const { dice, seed = Math.floor(Math.random() * 1e9), speed = 1, onSettled, numberAllFaces } = opts;
    cancelAnimationFrame(this.raf);
    this.clearDice();

    // --- 1. física headless, descartando simulações degeneradas ---
    const t0 = performance.now();
    const ids = dice.map((d) => d.id);
    let sim = simulate({ dice: ids, seed, record: true, viewDir: VIEW_DIR });
    let retries = 0;
    while (!sim.ok && retries < 12) {
      retries++;
      sim = simulate({ dice: ids, seed: seed + retries * 7919, record: true, viewDir: VIEW_DIR });
    }
    const simMs = performance.now() - t0;
    if (!sim.ok) throw new Error('Não foi possível gerar uma rolagem válida');

    const trayHalf = trayHalfFor(dice.length);

    // --- 2. rotulagem pós-simulação, antes do primeiro pixel ---
    for (let i = 0; i < dice.length; i++) {
      const spec = dice[i]!;
      const poly = POLYHEDRA[spec.id]!;
      // A geometria é construída DEPOIS da física, então dá para orientar a
      // face vencedora com a rotação final e o número sair de pé na tela.
      const last = sim.frames[i]![sim.frames[i]!.length - 1]!;
      const finalQ = new THREE.Quaternion(last.q[0], last.q[1], last.q[2], last.q[3]);
      const { geometry, cols } = buildDiceGeometry(poly, 0.92, {
        faceIndex: sim.topFaces[i]!,
        quaternion: finalQ,
      });
      const labels = labelFaces({
        dieId: spec.id,
        topFaceIndex: sim.topFaces[i]!,
        targetValue: spec.value,
        ...(spec.role ? { role: spec.role } : {}),
      });
      // Só a face que assentou recebe número. Ver texture.ts / doc 08 §3.2.
      const atlas = buildNumberAtlas({
        labels,
        cols,
        ...(numberAllFaces ? {} : { onlyFace: sim.topFaces[i]! }),
      });

      const material = this.makeMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);

      this.setUniform(material, 'uNumberMap', atlas);
      this.setUniform(material, 'uReveal', 0);

      const first = sim.frames[i]![0]!;
      mesh.position.set(first.p[0], first.p[1], first.p[2]);
      mesh.quaternion.set(first.q[0], first.q[1], first.q[2], first.q[3]);

      this.dice.push({ mesh, material, frames: sim.frames[i]!, reveal: { value: 0 } });
    }

    // --- 3. diagnóstico de contenção ---
    const restPositions = this.dice.map((d) => {
      const f = d.frames[d.frames.length - 1]!;
      return [f.p[0], f.p[1], f.p[2]] as [number, number, number];
    });
    const maxR = Math.max(...dice.map((d) => circumradius(POLYHEDRA[d.id]!)));
    this.frameToDice(restPositions, maxR);
    const contained = restPositions.every(
      ([x, y, z]) =>
        Math.abs(x) <= trayHalf + maxR && Math.abs(z) <= trayHalf + maxR && y > -0.2 && y < 4,
    );
    const onScreen = restPositions.every((p) => this.isOnScreen(p, maxR));

    // --- 4. reprodução ---
    const settleMs = await this.play(speed);
    onSettled?.();

    // --- 5. revelação por fade ---
    await this.revealNumbers();

    const diag: RendererDiagnostics = {
      retries,
      simMs,
      restPositions,
      trayHalf,
      contained,
      onScreen,
      settleMs,
      topFaces: sim.topFaces,
      values: dice.map((d) => d.value),
    };
    this.lastDiagnostics = diag;
    return diag;
  }

  /** O ponto cai dentro do frustum da câmera, com folga do raio do dado? */
  private isOnScreen(p: [number, number, number], radius: number): boolean {
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(this.camera);
    const margin = radius / (this.trayHalf * 2);
    return Math.abs(v.x) < 1 - margin * 0.5 && Math.abs(v.y) < 1 - margin * 0.5 && v.z < 1;
  }

  /**
   * `requestAnimationFrame` NÃO dispara com a aba em segundo plano. Sem o
   * watchdog abaixo, trocar de aba no meio da rolagem trava o app em "Rolando…"
   * para sempre, porque a Promise nunca resolve. O watchdog encerra a animação
   * pelo relógio, independente do rAF.
   */
  private withWatchdog<T>(
    budgetMs: number,
    body: (finish: (v: T) => void) => void,
    onTimeout: () => T,
  ): Promise<T> {
    return new Promise<T>((resolve) => {
      let done = false;
      const finish = (v: T) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      };
      const timer = setTimeout(() => {
        if (done) return;
        this.skipToRest();
        finish(onTimeout());
      }, budgetMs);
      body(finish);
    });
  }

  /** Põe cada dado na posição final, sem tocar na revelação. */
  private skipToRest(): void {
    cancelAnimationFrame(this.raf);
    for (const d of this.dice) {
      const f = d.frames[d.frames.length - 1]!;
      d.mesh.position.set(f.p[0], f.p[1], f.p[2]);
      d.mesh.quaternion.set(f.q[0], f.q[1], f.q[2], f.q[3]);
    }
  }

  private play(speed: number): Promise<number> {
    const total = Math.max(...this.dice.map((d) => d.frames.length));
    const expectedMs = (total * STEP_MS) / speed;

    // Já em segundo plano: nem começa a animar, vai direto ao repouso.
    if (typeof document !== 'undefined' && document.hidden) {
      this.skipToRest();
      return Promise.resolve(0);
    }

    return this.withWatchdog<number>(
      expectedMs + 1500,
      (finish) => {
        const start = performance.now();
        const tick = () => {
          if (this.disposed) return finish(0);
          const elapsed = (performance.now() - start) * speed;
          const frame = Math.floor(elapsed / STEP_MS);

          for (const d of this.dice) {
            const f = d.frames[Math.min(frame, d.frames.length - 1)]!;
            d.mesh.position.set(f.p[0], f.p[1], f.p[2]);
            d.mesh.quaternion.set(f.q[0], f.q[1], f.q[2], f.q[3]);
          }
          this.renderOnce();

          if (frame >= total - 1) return finish(performance.now() - start);
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
      },
      () => expectedMs,
    );
  }

  /**
   * O beat de silêncio antes do fade é o que dá peso dramático: sem ele, o
   * efeito lê como atraso de carregamento; com ele, lê como revelação.
   */
  private revealNumbers(beatMs = 140, fadeMs = 480): Promise<void> {
    const setAll = (v: number) => {
      for (const d of this.dice) this.setUniform(d.material, 'uReveal', v);
    };

    if (typeof document !== 'undefined' && document.hidden) {
      setAll(1);
      return Promise.resolve();
    }

    return this.withWatchdog<void>(
      beatMs + fadeMs + 1200,
      (finish) => {
        const start = performance.now();
        const tick = () => {
          if (this.disposed) return finish();
          const t = performance.now() - start;
          const raw = Math.min(1, Math.max(0, (t - beatMs) / fadeMs));
          // easeOutCubic: rápido no começo, assentando no fim.
          setAll(1 - Math.pow(1 - raw, 3));
          this.renderOnce();
          if (raw >= 1) return finish();
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
      },
      () => {
        setAll(1);
        this.renderOnce();
      },
    );
  }

  /**
   * Renderiza e devolve estatísticas dos pixels. Serve para verificação
   * automatizada: confirma que há dado desenhado e onde ele está na tela,
   * sem depender de screenshot.
   */
  inspect(): { nonEmpty: number; total: number; coverage: number; bounds: { minX: number; maxX: number; minY: number; maxY: number } | null; meanLuma: number } {
    this.renderOnce();
    const gl = this.renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);

    let nonEmpty = 0;
    let lumaSum = 0;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = buf[i + 3]!;
        if (a > 12) {
          nonEmpty++;
          lumaSum += 0.2126 * buf[i]! + 0.7152 * buf[i + 1]! + 0.0722 * buf[i + 2]!;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return {
      nonEmpty,
      total: w * h,
      coverage: nonEmpty / (w * h),
      bounds: maxX < 0 ? null : { minX, maxX, minY, maxY },
      meanLuma: nonEmpty > 0 ? lumaSum / nonEmpty : 0,
    };
  }

  /**
   * Mede a LEGIBILIDADE do número na face de cima.
   *
   * Renderiza duas vezes — sem o número e com ele — e compara. Diz quantos
   * pixels o número ocupa e qual o contraste dele contra a face. Cobertura de
   * pixels sozinha não prova que dá para ler o resultado; isto prova.
   */
  inspectLegibility(): { numberPixels: number; contrast: number; ratioOfDie: number } {
    const grab = (reveal: number) => {
      for (const d of this.dice) this.setUniform(d.material, 'uReveal', reveal);
      this.renderOnce();
      const gl = this.renderer.getContext();
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return buf;
    };

    const off = grab(0);
    const on = grab(1);

    let numberPixels = 0;
    let diePixels = 0;
    let lumaOn = 0;
    let lumaOff = 0;
    const luma = (b: Uint8Array, i: number) =>
      0.2126 * b[i]! + 0.7152 * b[i + 1]! + 0.0722 * b[i + 2]!;

    for (let i = 0; i < off.length; i += 4) {
      if (off[i + 3]! > 40) diePixels++;
      const d = Math.abs(luma(on, i) - luma(off, i));
      if (d > 18) {
        numberPixels++;
        lumaOn += luma(on, i);
        lumaOff += luma(off, i);
      }
    }

    return {
      numberPixels,
      // Contraste médio entre o número e a face por baixo dele.
      contrast: numberPixels > 0 ? (lumaOn - lumaOff) / numberPixels : 0,
      ratioOfDie: diePixels > 0 ? numberPixels / diePixels : 0,
    };
  }

  /**
   * PNG do frame atual, em data URL. Render e leitura acontecem na mesma volta
   * síncrona — sem isso o buffer já teria sido descartado pelo compositor.
   */
  snapshot(): string {
    this.renderOnce();
    return this.canvas.toDataURL('image/png');
  }

  /** PNG do atlas de números do primeiro dado — para inspeção visual. */
  atlasSnapshot(): string | null {
    const u = (this.dice[0]?.material as MaterialWithUniforms | undefined)?.userData.diceUniforms;
    const tex = u?.uNumberMap.value as THREE.CanvasTexture | null | undefined;
    const img = tex?.image as HTMLCanvasElement | undefined;
    return img?.toDataURL('image/png') ?? null;
  }

  /** Mostra o resultado na hora, sem animação. */
  skip(): void {
    cancelAnimationFrame(this.raf);
    for (const d of this.dice) {
      const f = d.frames[d.frames.length - 1]!;
      d.mesh.position.set(f.p[0], f.p[1], f.p[2]);
      d.mesh.quaternion.set(f.q[0], f.q[1], f.q[2], f.q[3]);
      this.setUniform(d.material, 'uReveal', 1);
    }
    this.renderOnce();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.clearDice();
    this.floor?.geometry.dispose();
    this.renderer.dispose();
  }
}

/** Monta os dois d10 percentuais a partir de um resultado de d100. */
export function percentileDice(total: number): DieSpec[] {
  const { tens, units } = splitPercentile(total);
  return [
    { id: 'd10', value: tens, role: 'tens' },
    { id: 'd10', value: units, role: 'units' },
  ];
}
