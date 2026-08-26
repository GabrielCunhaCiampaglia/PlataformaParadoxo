import { POLYHEDRA, simulate, validate } from '@paradoxo/dice-3d';
import { useCallback, useRef, useState } from 'react';

/**
 * Dia 3 da prova de conceito (doc 08 §4): medir no aparelho REAL.
 *
 * Os números do Dia 1 são de desktop. Celular intermediário costuma ser 3× a 5×
 * mais lento, e isso precisa ser medido — não estimado.
 *
 * A simulação roda em fatias, com pausa entre elas, para não travar a interface
 * e para o navegador poder aplicar throttling térmico de verdade. Medir num loop
 * bloqueante daria um número otimista que a mesa nunca veria.
 */

interface Scenario {
  label: string;
  dice: string[];
  runs: number;
  /** Limite de p95 em ms, escalado para celular. */
  budget: number;
}

const SCENARIOS: Scenario[] = [
  { label: '2×d10 — o d100', dice: ['d10', 'd10'], runs: 400, budget: 60 },
  { label: '1×d20', dice: ['d20'], runs: 150, budget: 60 },
  { label: '3×d6', dice: ['d6', 'd6', 'd6'], runs: 150, budget: 90 },
  { label: '10×d6 — pior caso', dice: Array(10).fill('d6'), runs: 80, budget: 250 },
];

interface Row {
  label: string;
  runs: number;
  degenerate: number;
  p50: number;
  p95: number;
  p99: number;
  budget: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

const idle = () => new Promise((r) => setTimeout(r, 0));

export default function PocDados() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [geomOk, setGeomOk] = useState<string | null>(null);
  const [device, setDevice] = useState('');
  const cancel = useRef(false);

  const run = useCallback(async () => {
    setRunning(true);
    setRows([]);
    cancel.current = false;

    const issues = Object.values(POLYHEDRA).flatMap((p) => validate(p));
    setGeomOk(issues.length === 0 ? 'as 5 geometrias passaram' : `${issues.length} problema(s)`);

    const nav = navigator as Navigator & { deviceMemory?: number };
    setDevice(
      `${nav.hardwareConcurrency ?? '?'} núcleos · ${nav.deviceMemory ?? '?'} GB · ${screen.width}×${screen.height}`,
    );

    const out: Row[] = [];
    let seed = Date.now() % 100000;

    // AQUECIMENTO, descartado da medição.
    // Sem isto, o primeiro cenário absorve todo o JIT e as primeiras pausas de
    // GC, e mede 211 ms de p95 com 7 ms de mediana — enquanto um cenário 5×
    // mais pesado, rodando depois, mede 51 ms. O número seria uma mentira.
    setProgress('aquecendo…');
    await idle();
    for (let i = 0; i < 40; i++) {
      simulate({ dice: ['d10', 'd10'], seed: seed++ });
      if (i % 10 === 9) await idle();
    }
    for (let i = 0; i < 10; i++) simulate({ dice: Array(10).fill('d6'), seed: seed++ });
    await idle();

    for (const s of SCENARIOS) {
      const cpu: number[] = [];
      let degenerate = 0;

      for (let i = 0; i < s.runs; i++) {
        if (cancel.current) break;
        const r = simulate({ dice: s.dice, seed: seed++ });
        cpu.push(r.cpuMs);
        if (!r.ok) degenerate++;

        // Cede o controle a cada 10 rodadas: mantém a interface viva e deixa o
        // navegador aplicar throttling térmico como aplicaria numa sessão real.
        if (i % 10 === 9) {
          setProgress(`${s.label} — ${i + 1}/${s.runs}`);
          await idle();
        }
      }

      cpu.sort((a, b) => a - b);
      out.push({
        label: s.label,
        runs: cpu.length,
        degenerate,
        p50: percentile(cpu, 50),
        p95: percentile(cpu, 95),
        p99: percentile(cpu, 99),
        budget: s.budget,
      });
      setRows([...out]);
      if (cancel.current) break;
    }

    setProgress('');
    setRunning(false);
  }, []);

  const totalRuns = rows.reduce((a, r) => a + r.runs, 0);
  const totalDegen = rows.reduce((a, r) => a + r.degenerate, 0);
  const degenRate = totalRuns > 0 ? (totalDegen / totalRuns) * 100 : 0;
  const allWithinBudget = rows.length === SCENARIOS.length && rows.every((r) => r.p95 <= r.budget);
  const done = rows.length === SCENARIOS.length && !running;

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <main className="app">
        <header className="brand">
          <span className="brand__dot" />
          Prova de conceito
          <span className="brand__ver">Dia 3</span>
        </header>

        <section className="panel">
          <p className="hint" style={{ margin: 0 }}>
            Mede a física dos dados <strong>neste aparelho</strong>. No desktop deu 0,002% de
            falha e 11 ms de p95 no d100. Falta saber quanto custa no celular que vai para a
            mesa. Deixe a tela ligada e não troque de app enquanto roda.
          </p>

          <button className="btn" type="button" onClick={run} disabled={running}>
            {running ? 'Medindo…' : 'Rodar teste'}
          </button>

          {running ? (
            <>
              <p className="result__empty" style={{ textAlign: 'center' }}>
                {progress || 'iniciando'}
              </p>
              <button
                className="linkbtn"
                type="button"
                onClick={() => {
                  cancel.current = true;
                }}
              >
                Cancelar
              </button>
            </>
          ) : null}

          {device ? <p className="hint">Aparelho: {device}</p> : null}
          {geomOk ? <p className="hint">Geometrias: {geomOk}</p> : null}
        </section>

        {rows.length > 0 ? (
          <section className="panel">
            <span className="history__title">Resultados</span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((r) => {
                const ok = r.p95 <= r.budget;
                return (
                  <li
                    key={r.label}
                    style={{
                      padding: '12px 0',
                      borderTop: '1px solid var(--line-soft)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <strong style={{ fontSize: 14 }}>{r.label}</strong>
                      <span className={ok ? 'o-good' : 'o-fail'} style={{ fontWeight: 800 }}>
                        {r.p95.toFixed(1)} ms
                      </span>
                    </div>
                    <span className="history__src" style={{ marginLeft: 0 }}>
                      {r.runs} rodadas · p50 {r.p50.toFixed(1)} ms · p99 {r.p99.toFixed(1)} ms · limite {r.budget} ms ·{' '}
                      {r.degenerate === 0
                        ? 'nenhuma falha'
                        : `${((r.degenerate / r.runs) * 100).toFixed(1)}% de falha`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {done ? (
          <section className="panel">
            <span className="history__title">Veredito</span>
            <p
              className={degenRate < 2 && allWithinBudget ? 'o-good' : 'o-fail'}
              style={{ fontSize: 18, fontWeight: 800, margin: '8px 0' }}
            >
              {degenRate < 2 && allWithinBudget ? 'APROVADO neste aparelho' : 'FORA DO ORÇAMENTO'}
            </p>
            <p className="hint" style={{ margin: 0 }}>
              {totalDegen} falha(s) em {totalRuns} rodadas ({degenRate.toFixed(3)}%). A animação
              dura cerca de 1,2 s, então o custo de simulação precisa ser uma fração disso — o
              jogador não pode esperar.
            </p>
            <p className="note" style={{ marginTop: 14 }}>
              Mande um print desta tela. Se puder, confira também a temperatura da bateria antes
              e depois de rodar algumas vezes.
            </p>
          </section>
        ) : null}

        <p className="note">
          <a href="/" style={{ color: 'var(--muted)' }}>
            ← voltar para a rolagem
          </a>
        </p>
      </main>
    </>
  );
}
