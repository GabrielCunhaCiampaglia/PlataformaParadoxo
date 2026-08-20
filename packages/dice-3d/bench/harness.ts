/**
 * Harness da prova de conceito — doc 08 §4, Dia 1 e Dia 2.
 *
 * Mata ou aprova a hipótese H1:
 *   "cannon-es leva de 2 a 10 poliedros convexos ao repouso, headless, de forma
 *    confiável, para as cinco geometrias, sem interpenetração, sem dado que
 *    nunca assenta e sem exceção."
 *
 * Critério de morte: mais de 2% de rodadas degeneradas.
 *
 * Rode com: pnpm --filter @paradoxo/dice-3d bench
 */
import { POLYHEDRA, validate } from '../src/polyhedra.js';
import { simulate, type Degeneracy } from '../src/simulate.js';

const TOTAL = Number(process.env.RUNS ?? 50_000);

/** A amostra reflete o uso real: o d100 é a rolagem mais frequente do sistema. */
const MIX: Array<{ label: string; dice: string[]; weight: number }> = [
  { label: '2×d10 (o d100)', dice: ['d10', 'd10'], weight: 0.7 },
  { label: '1×d20', dice: ['d20'], weight: 0.1 },
  { label: '3×d6', dice: ['d6', 'd6', 'd6'], weight: 0.1 },
  { label: '10×d6 (dano pesado)', dice: Array(10).fill('d6'), weight: 0.05 },
  { label: '2×d4 + 2×d8', dice: ['d4', 'd4', 'd8', 'd8'], weight: 0.05 },
];

interface Stats {
  runs: number;
  ok: number;
  degen: Record<string, number>;
  cpu: number[];
  steps: number[];
  faceHits: Map<string, number[]>;
}

function pct(v: number[], p: number): number {
  if (v.length === 0) return 0;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
}

function fmt(n: number, d = 1): string {
  return n.toFixed(d);
}

console.log('='.repeat(72));
console.log('PoC ROLAGEM 3D — cannon-es headless');
console.log('='.repeat(72));

// --- Dia 1, parte 0: as geometrias são válidas para o cannon-es? ---
console.log('\n[1] Validação das geometrias\n');
let geomBad = 0;
for (const [id, p] of Object.entries(POLYHEDRA)) {
  const issues = validate(p);
  geomBad += issues.length;
  console.log(
    `    ${id.padEnd(4)} ${String(p.faces.length).padStart(2)} faces  ` +
      (issues.length === 0 ? 'ok' : `${issues.length} PROBLEMA(S)`),
  );
  for (const i of issues.slice(0, 3)) console.log(`         ! ${i.kind}: ${i.detail}`);
}
if (geomBad > 0) {
  console.log('\n  FALHA: geometria inválida derruba o cannon-es. Abortando.');
  process.exit(1);
}

// --- Dia 1: 50.000 simulações ---
console.log(`\n[2] ${TOTAL.toLocaleString('pt-BR')} simulações headless\n`);

const byMix = new Map<string, Stats>();
for (const m of MIX) {
  byMix.set(m.label, { runs: 0, ok: 0, degen: {}, cpu: [], steps: [], faceHits: new Map() });
}

const t0 = performance.now();
let seed = 1;
let done = 0;

for (const m of MIX) {
  const n = Math.round(TOTAL * m.weight);
  const st = byMix.get(m.label)!;

  for (let i = 0; i < n; i++) {
    const r = simulate({ dice: m.dice, seed: seed++ });
    st.runs++;
    st.cpu.push(r.cpuMs);
    st.steps.push(r.steps);

    if (r.ok) {
      st.ok++;
      // Dia 2: distribuição de faces de repouso, por tipo de dado.
      for (let d = 0; d < m.dice.length; d++) {
        const id = m.dice[d]!;
        let hits = st.faceHits.get(id);
        if (!hits) {
          hits = new Array(POLYHEDRA[id]!.faceCount).fill(0);
          st.faceHits.set(id, hits);
        }
        hits[r.topFaces[d]!]!++;
      }
    } else {
      const k = r.degeneracy as Degeneracy;
      st.degen[k] = (st.degen[k] ?? 0) + 1;
    }

    done++;
    if (done % 10_000 === 0) {
      process.stdout.write(`    ${done.toLocaleString('pt-BR')} / ${TOTAL.toLocaleString('pt-BR')}\r`);
    }
  }
}
const elapsed = (performance.now() - t0) / 1000;

console.log(`    concluído em ${fmt(elapsed)} s\n`);
console.log(
  '    ' +
    'cenário'.padEnd(22) +
    'rodadas'.padStart(9) +
    'degen.'.padStart(9) +
    'p50 ms'.padStart(9) +
    'p95 ms'.padStart(9) +
    'p95 passos'.padStart(12),
);
console.log('    ' + '-'.repeat(70));

let totalRuns = 0;
let totalDegen = 0;
const allDegen: Record<string, number> = {};

for (const m of MIX) {
  const st = byMix.get(m.label)!;
  const degen = st.runs - st.ok;
  totalRuns += st.runs;
  totalDegen += degen;
  for (const [k, v] of Object.entries(st.degen)) allDegen[k] = (allDegen[k] ?? 0) + v;

  console.log(
    '    ' +
      m.label.padEnd(22) +
      String(st.runs).padStart(9) +
      `${fmt((degen / st.runs) * 100, 2)}%`.padStart(9) +
      fmt(pct(st.cpu, 50), 2).padStart(9) +
      fmt(pct(st.cpu, 95), 2).padStart(9) +
      String(pct(st.steps, 95)).padStart(12),
  );
}

const degenRate = (totalDegen / totalRuns) * 100;
console.log('    ' + '-'.repeat(70));
console.log(`    TOTAL degenerado: ${fmt(degenRate, 3)}%  (${totalDegen} de ${totalRuns})`);
if (Object.keys(allDegen).length > 0) {
  for (const [k, v] of Object.entries(allDegen)) console.log(`      ${k}: ${v}`);
}

// --- Dia 2: cobertura de faces ---
console.log('\n[3] Cobertura de faces — toda face precisa ser alcançável\n');

const merged = new Map<string, number[]>();
for (const st of byMix.values()) {
  for (const [id, hits] of st.faceHits) {
    const cur = merged.get(id) ?? new Array(hits.length).fill(0);
    for (let i = 0; i < hits.length; i++) cur[i]! += hits[i]!;
    merged.set(id, cur);
  }
}

let uncovered = 0;
for (const id of ['d4', 'd6', 'd8', 'd10', 'd20']) {
  const hits = merged.get(id);
  if (!hits) continue;
  const total = hits.reduce((a, b) => a + b, 0);
  const zero = hits.filter((h) => h === 0).length;
  uncovered += zero;
  const min = Math.min(...hits);
  const max = Math.max(...hits);
  const expected = total / hits.length;
  const bias = total > 0 ? ((max - min) / expected) * 100 : 0;
  console.log(
    `    ${id.padEnd(4)} amostras=${String(total).padStart(7)}  ` +
      `faces nunca alcançadas=${zero}  ` +
      `desvio min-max=${fmt(bias, 1)}% do esperado`,
  );
}

// --- veredito ---
console.log('\n' + '='.repeat(72));
const p95Percentil = pct(byMix.get('2×d10 (o d100)')!.cpu, 95);
const p95Pesado = pct(byMix.get('10×d6 (dano pesado)')!.cpu, 95);

const checks: Array<[string, boolean, string]> = [
  ['Rodadas degeneradas < 2%', degenRate < 2, `${fmt(degenRate, 3)}%`],
  ['2×d10 p95 < 30 ms (desktop)', p95Percentil < 30, `${fmt(p95Percentil, 2)} ms`],
  ['10×d6 p95 < 120 ms (desktop)', p95Pesado < 120, `${fmt(p95Pesado, 2)} ms`],
  ['Toda face alcançável', uncovered === 0, `${uncovered} não alcançadas`],
];

console.log('VEREDITO\n');
for (const [label, pass, detail] of checks) {
  console.log(`  ${pass ? 'PASSA ' : 'FALHA '} ${label.padEnd(34)} ${detail}`);
}
const allPass = checks.every(([, p]) => p);
console.log(
  '\n' +
    (allPass
      ? '  H1 SOBREVIVE no desktop. Falta o Dia 3: medir em Android intermediário.'
      : '  H1 REPROVADA. Ver planos B no doc 08 §4.'),
);
console.log('='.repeat(72));
