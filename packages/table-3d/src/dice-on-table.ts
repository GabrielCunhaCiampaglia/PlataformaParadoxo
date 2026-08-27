import {
  POLYHEDRA,
  applyDiceNumbering,
  buildDiceGeometry,
  buildNumberAtlas,
  ensureDiceFont,
  labelFaces,
  readTrack,
  setDiceUniform,
  simulate,
  trayHalfFor,
  type DieSpec,
  type DieTrack,
} from '@paradoxo/dice-3d';
import * as THREE from 'three';
import { applyPS1 } from './ps1.js';

/**
 * A rolagem, ACONTECENDO SOBRE A MESA.
 *
 * Não é um segundo renderer. A física, a rotulagem pós-simulação e o shader de
 * numeração são exatamente os mesmos do módulo de rolagem — o que muda é onde a
 * cena é desenhada e com que material. Reimplementar qualquer uma dessas três
 * partes seria criar uma cópia que diverge no primeiro ajuste, e cada uma delas
 * carrega correções que não sobreviveriam a uma segunda escrita.
 *
 * O que este arquivo faz de próprio é a mudança de escala. A simulação trabalha
 * num tray de raio ~2 a 4 e dados de raio 1; a mesa trabalha em metros, com um
 * tapete de 0,94 × 0,76. Tudo aqui vive dentro de um `Group` posicionado sobre o
 * tapete e escalado para caber nele, então a física continua nas unidades dela e
 * a mesa nas dela.
 */

/** Meias-medidas do tapete, em unidades de mundo. Ver SIZES em viewpoints.ts. */
const MAT_HALF_X = 0.47;
const MAT_HALF_Z = 0.38;

/**
 * Quanto do tapete o tray da simulação deve ocupar.
 *
 * Abaixo de 1 sobra friso; acima, os dados encostariam na costura. 0,86 deixa a
 * borda respirando sem desperdiçar tapete.
 */
const MAT_FILL = 0.86;

/**
 * Raio máximo de um dado, em unidades de mundo.
 *
 * Sem teto, o dado era dimensionado só pelo tray e ficava do tamanho de um punho
 * sobre o tapete. O teto vale para um ou dois dados; com muitos, quem manda volta
 * a ser o tray, e eles encolhem para caber — que é o comportamento certo.
 */
const DIE_MAX_RADIUS = 0.09;

/**
 * Velocidade da reprodução.
 *
 * A física assenta em 2,6 s na mediana e chega a 9 s na cauda, medido em 80
 * rolagens por formato. É tempo demais olhando dado rolar: a cauda lê como
 * travamento, não como suspense. Acelerar a REPRODUÇÃO encurta sem tocar na
 * simulação, então o resultado e a validação de legibilidade continuam os
 * mesmos.
 */
const PLAYBACK_SPEED = 1.9;

/** Quanto tempo o número leva para surgir depois de o dado parar. */
const BEAT_MS = 140;
const FADE_MS = 420;

/** Direção da câmera na vista de dados — precisa casar com `viewpoints.ts`. */
const VIEW_DIR = [0, 0.978, 0.208] as const;

interface Die {
  mesh: THREE.Mesh;
  material: THREE.Material;
  track: DieTrack;
  topFace: number;
}

export interface TableRollResult {
  /** Valores lidos, na ordem pedida. */
  values: number[];
  /** Quantas simulações foram descartadas. */
  retries: number;
  simMs: number;
  /** Todos os dados pararam dentro do tapete? */
  contained: boolean;
}

export class DiceOnTable {
  /** Tudo vive aqui dentro: posicionado sobre o tapete, escalado para a mesa. */
  readonly group = new THREE.Group();

  private dice: Die[] = [];
  private disposables: Array<{ dispose(): void }> = [];
  private playing = false;

  private readonly base = new THREE.Vector3();

  /** Põe o grupo sobre o tapete.  é a altura da superfície do tapete. */
  placeOn(x: number, y: number, z: number): void {
    this.base.set(x, y, z);
    this.group.position.copy(this.base);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Simula, rotula e prepara a gravação. NÃO desenha — quem desenha é a cena,
   * chamando `advance` a cada quadro.
   *
   * Os dados da rolagem anterior só somem AQUI, no começo da próxima. É o que
   * faz a última rolagem continuar sobre a mesa depois que o jogador sai da
   * vista de dados, que foi o pedido.
   */
  async prepare(dice: DieSpec[], seed?: number): Promise<TableRollResult> {
    this.clear();

    const t0 = performance.now();
    const ids = dice.map((d) => d.id);
    const s = seed ?? Math.floor(Math.random() * 1e9);

    let sim = simulate({ dice: ids, seed: s, record: true, viewDir: VIEW_DIR });
    let retries = 0;
    while (!sim.ok && retries < 12) {
      retries++;
      sim = simulate({ dice: ids, seed: s + retries * 7919, record: true, viewDir: VIEW_DIR });
    }
    const simMs = performance.now() - t0;
    if (!sim.ok) throw new Error('Não foi possível gerar uma rolagem válida');

    // A webfont precisa estar carregada antes do primeiro atlas, senão o número
    // sai desenhado no fallback do sistema, em silêncio.
    await ensureDiceFont();

    for (let i = 0; i < dice.length; i++) {
      const spec = dice[i]!;
      const poly = POLYHEDRA[spec.id];
      if (!poly) continue;

      const { geometry, cols, aspect, corners } = buildDiceGeometry(poly);
      this.disposables.push(geometry);

      const isD4 = spec.id === 'd4';
      const labels = labelFaces({
        dieId: spec.id,
        topFaceIndex: sim.topFaces[i]!,
        targetValue: spec.value,
        ...(spec.role ? { role: spec.role } : {}),
      });
      const atlas = buildNumberAtlas({
        labels,
        cols,
        aspect,
        ...(isD4 ? { corners, vertexLabels: labels, topVertex: sim.topFaces[i]! } : {}),
      });
      this.disposables.push(atlas);

      // Lambert com o shader de época, não o Standard da rolagem em tela cheia.
      // Um dado em PBR sobre uma mesa de 1998 lê como recorte de outro jogo.
      const material = new THREE.MeshLambertMaterial({ color: 0x6b5aa8, emissive: 0x120c22 });
      applyDiceNumbering(material);
      applyPS1(material);
      this.disposables.push(material);

      setDiceUniform(material, 'uNumberMap', atlas);
      setDiceUniform(material, 'uCols', cols);
      setDiceUniform(material, 'uTopFace', isD4 ? -1 : sim.topFaces[i]!);
      setDiceUniform(material, 'uReveal', 0);
      setDiceUniform(material, 'uFlash', 0);

      const mesh = new THREE.Mesh(geometry, material);
      const track = sim.frames[i]!;
      readTrack(track, 0, mesh.position, mesh.quaternion);
      this.group.add(mesh);

      this.dice.push({ mesh, material, track, topFace: sim.topFaces[i]! });
    }

    // A ESCALA acompanha o número de dados.
    //
    // A simulação trabalha num tray que cresce com a quantidade — 2,4 para dois
    // dados, 4,4 para dez — e com dados de raio 1. Uma escala fixa fazia dois
    // dados ocuparem um punhado de pixels no meio do tapete. Casando o tray com
    // o tapete, o dado fica grande quando é um só e encolhe conforme o punhado
    // cresce, que é o que acontece numa mesa de verdade.
    const trayHalf = trayHalfFor(dice.length);
    const scale = Math.min(DIE_MAX_RADIUS, (Math.min(MAT_HALF_X, MAT_HALF_Z) * MAT_FILL) / trayHalf);
    this.group.scale.setScalar(scale);

    // Os dados são ARREMESSADOS da frente e assentam no fundo do tray: medido em
    // 60 rolagens, o centro deles fica a uns 25% do raio para trás. Sem
    // compensar, eles se amontoavam na metade de cima do tapete e a de baixo
    // ficava vazia. O deslocamento traz o grupo de volta ao centro do tapete.
    this.group.position.z = this.base.z + 0.25 * trayHalf * scale;

    const contained = this.dice.every((d) => {
      const o = (d.track.steps - 1) * 7;
      const a = d.track.data;
      return Math.abs(a[o]!) <= trayHalf + 1 && Math.abs(a[o + 2]!) <= trayHalf + 1.2;
    });

    this.playing = true;
    this.elapsed = 0;
    this.done = new Promise<void>((resolve) => {
      this.settled = resolve;
    });

    // Rede de proteção pelo RELÓGIO, não pelo rAF.
    //
    // `requestAnimationFrame` não dispara com a aba em segundo plano. Sem isto,
    // trocar de aba no meio de uma rolagem deixaria `whenSettled` pendente para
    // sempre e a interface presa em "Rolando…" — o mesmo defeito que já apareceu
    // no módulo de rolagem em tela cheia. O prazo é o da própria gravação, com
    // folga.
    const steps = Math.max(...this.dice.map((x) => x.track.steps), 1);
    const budget = (steps * 1000) / 60 / PLAYBACK_SPEED + BEAT_MS + FADE_MS + 1500;
    clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => {
      if (this.playing) this.finish();
    }, budget) as unknown as number;
    return { values: dice.map((d) => d.value), retries, simMs, contained };
  }

  private elapsed = 0;
  private settled: (() => void) | null = null;
  private watchdog = 0;

  /**
   * Avança a reprodução. Devolve `true` enquanto houver o que animar.
   *
   * A cena chama isto a cada quadro e desenha; quando devolver `false`, ela pode
   * voltar a dormir. É o mesmo contrato de renderização sob demanda do resto da
   * mesa — nada aqui pede um laço permanente.
   */
  advance(dtMs: number): boolean {
    if (!this.playing) return false;
    this.elapsed += dtMs * PLAYBACK_SPEED;

    const steps = Math.max(...this.dice.map((d) => d.track.steps));
    const frame = Math.floor(this.elapsed / (1000 / 60));

    for (const d of this.dice) {
      readTrack(d.track, frame, d.mesh.position, d.mesh.quaternion);
    }

    // Depois de assentar, a revelação — em cascata, um dado por vez.
    const settleMs = (steps * 1000) / 60;
    const stagger = Math.min(70, 420 / Math.max(1, this.dice.length));

    let done = frame >= steps - 1;
    for (let i = 0; i < this.dice.length; i++) {
      const local = (this.elapsed - settleMs - BEAT_MS - i * stagger) / FADE_MS;
      const raw = Math.min(1, Math.max(0, local));
      setDiceUniform(this.dice[i]!.material, 'uReveal', 1 - Math.pow(1 - raw, 3));
      setDiceUniform(
        this.dice[i]!.material,
        'uFlash',
        raw > 0 && raw < 1 ? Math.pow(Math.sin(Math.PI * raw), 1.5) : 0,
      );
      if (raw < 1) done = false;
    }

    if (done) this.stop();
    return this.playing;
  }

  /** Salta para o fim: dados no repouso, números plenos. */
  finish(): void {
    for (const d of this.dice) {
      readTrack(d.track, d.track.steps - 1, d.mesh.position, d.mesh.quaternion);
      setDiceUniform(d.material, 'uReveal', 1);
      setDiceUniform(d.material, 'uFlash', 0);
    }
    this.stop();
  }

  private stop(): void {
    clearTimeout(this.watchdog);
    this.playing = false;
    this.settled?.();
    this.settled = null;
  }

  /**
   * Resolve quando o número terminou de aparecer.
   *
   * É o que separa o resultado do suspense: a interface só mostra o total DEPOIS
   * disto. Antes, ela mostrava assim que a simulação terminava — ou seja, com o
   * dado ainda no ar, e o jogador já sabendo o que ia dar.
   */
  private done: Promise<void> = Promise.resolve();
  whenSettled(): Promise<void> {
    return this.done;
  }

  /** Quantos dados estão na mesa agora. */
  get count(): number {
    return this.dice.length;
  }

  clear(): void {
    for (const d of this.dice) this.group.remove(d.mesh);
    for (const x of this.disposables) x.dispose();
    this.disposables = [];
    this.dice = [];
    this.playing = false;
  }

  dispose(): void {
    this.clear();
  }
}

/** Ajuda a compor o par percentual do d100. */
export function percentileSpec(total: number): DieSpec[] {
  const tens = Math.floor(total / 10) % 10;
  const units = total % 10;
  return [
    { id: 'd10', value: total === 100 ? 0 : tens * 10, role: 'tens' },
    { id: 'd10', value: total === 100 ? 0 : units, role: 'units' },
  ];
}

