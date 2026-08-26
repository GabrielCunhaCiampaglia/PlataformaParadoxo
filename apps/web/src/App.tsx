import { percentileDice, type DieSpec } from '@paradoxo/dice-3d';
import {
  PARADOXO_EPIFANICO_V1 as RULESET,
  rollAction,
  rollDamage,
  type RollResult,
} from '@paradoxo/rules';
import { useCallback, useEffect, useRef, useState } from 'react';
import DiceCanvas, { type DiceCanvasHandle } from './DiceCanvas';

type Tab = 'acao' | 'dano';

interface HistoryEntry {
  id: number;
  total: number;
  detail: string;
  source: string;
  outcome: string | null;
  label: string | null;
}

const STORAGE_KEY = 'pe.historico.v1';

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Dano usa os sólidos que existem; os demais viram par de d10. */
function damageDice(sides: number, quantity: number, values: number[]): DieSpec[] {
  const solid = [4, 6, 8, 10, 20];
  if (solid.includes(sides)) {
    return values.map((v) => ({ id: `d${sides}`, value: v }));
  }
  // d2 e d3 rolam num d6 rotulado; o resto usa o par percentual.
  if (sides === 2 || sides === 3) return values.map((v) => ({ id: 'd6', value: v }));
  return values.flatMap((v) => percentileDice(Math.min(100, Math.max(1, v))));
}

export default function App() {
  const [tab, setTab] = useState<Tab>('acao');
  const [skill, setSkill] = useState('');
  const [sides, setSides] = useState(6);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<RollResult | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const diceRef = useRef<DiceCanvasHandle>(null);

  // Continua a numeração do histórico carregado. Reiniciando em 0, as entradas
  // novas colidiam com as antigas e o React reclamava de keys duplicadas.
  const nextId = useRef(history.reduce((max, h) => Math.max(max, h.id), 0));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* cota cheia ou modo privado: o histórico só não persiste */
    }
  }, [history]);

  const push = useCallback((entry: Omit<HistoryEntry, 'id'>) => {
    const id = ++nextId.current;
    setHistory((prev) => [{ ...entry, id }, ...prev].slice(0, 40));
  }, []);

  const animate = useCallback(async (dice: DieSpec[]) => {
    setRolling(true);
    setShowResult(false);
    try {
      await diceRef.current?.roll(dice);
    } catch {
      /* se a física falhar, o número já está na tela de qualquer forma */
    }
    setShowResult(true);
    setRolling(false);
  }, []);

  async function doAction() {
    if (rolling) return;
    const parsed = skill.trim() === '' ? null : Number.parseInt(skill, 10);
    const value = parsed !== null && Number.isInteger(parsed) ? parsed : null;

    const r = rollAction(RULESET, { skill: value });
    setResult(r);
    setLabel(r.label);
    setOutcome(r.outcome);
    push({
      total: r.total,
      detail: `${r.dice[0]!.value} + ${r.dice[1]!.value}`,
      source: value === null ? 'livre' : `perícia ${value}`,
      outcome: r.outcome,
      label: r.label,
    });
    await animate(percentileDice(r.total));
  }

  async function doDamage() {
    if (rolling) return;
    const r = rollDamage(RULESET, { sides, quantity });
    setResult(r);
    setLabel(null);
    setOutcome(null);
    push({
      total: r.total,
      detail: r.dice.map((d) => d.value).join(' + '),
      source: r.expression,
      outcome: null,
      label: null,
    });
    await animate(
      damageDice(
        sides,
        quantity,
        r.dice.map((d) => d.value),
      ),
    );
  }

  // Ponte para verificação automatizada da interface.
  useEffect(() => {
    (window as unknown as { __dice?: unknown }).__dice = diceRef.current;
  });

  const outcomeClass = outcome ? `o-${outcome}` : '';
  const isAction = result?.kind === 'action';

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <main className="app">
        <header className="brand">
          <span className="brand__dot" />
          Paradoxo Epifânico
          <span className="brand__ver">Prévia</span>
        </header>

        <section className="stage">
          <DiceCanvas ref={diceRef} />
          <div className="stage__hud" aria-live="polite">
            {showResult && result ? (
              <div className="reveal">
                <p className="hud__calc">
                  {isAction
                    ? `${result.dice[0]!.value} + ${result.dice[1]!.value} =`
                    : result.dice.length > 1
                      ? `${result.dice.map((d) => d.value).join(' + ')} =`
                      : ''}
                </p>
                <p className={`hud__total ${outcomeClass}`}>{result.total}</p>
                {label ? <p className={`hud__label ${outcomeClass}`}>{label}</p> : null}
              </div>
            ) : rolling ? (
              <p className="hud__hint">toque para pular</p>
            ) : (
              <p className="hud__hint">role os dados</p>
            )}
          </div>
        </section>

        <div className="tabs" role="tablist" aria-label="Tipo de rolagem">
          <button
            className="tab"
            role="tab"
            type="button"
            aria-selected={tab === 'acao'}
            onClick={() => setTab('acao')}
          >
            Ação
          </button>
          <button
            className="tab"
            role="tab"
            type="button"
            aria-selected={tab === 'dano'}
            onClick={() => setTab('dano')}
          >
            Dano
          </button>
        </div>

        <section className="panel">
          {tab === 'acao' ? (
            <>
              <div className="field">
                <label className="label" htmlFor="pericia">
                  Perícia — opcional
                </label>
                <input
                  id="pericia"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  placeholder="deixe vazio para rolar livre"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                />
                <p className="hint">
                  Com perícia, o resultado é interpretado. Sem perícia, mostra só o número.
                </p>
              </div>
              <button className="btn" type="button" onClick={doAction} disabled={rolling}>
                {rolling ? 'Rolando…' : 'Rolar d100'}
              </button>
            </>
          ) : (
            <>
              <div className="row">
                <div className="field">
                  <label className="label" htmlFor="qtd">
                    Quantidade
                  </label>
                  <input
                    id="qtd"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                    }
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="dado">
                    Dado
                  </label>
                  <select
                    id="dado"
                    value={sides}
                    onChange={(e) => setSides(Number(e.target.value))}
                  >
                    {RULESET.damage.dice.map((d) => (
                      <option key={d} value={d}>
                        D{d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="btn" type="button" onClick={doDamage} disabled={rolling}>
                {rolling ? 'Rolando…' : 'Rolar dano'}
              </button>
            </>
          )}
        </section>

        {history.length > 0 ? (
          <section className="panel history">
            <div className="history__head">
              <span className="history__title">Histórico</span>
              <button className="linkbtn" type="button" onClick={() => setHistory([])}>
                Limpar
              </button>
            </div>
            <ul>
              {history.map((h) => (
                <li key={h.id}>
                  <span className={`history__val ${h.outcome ? `o-${h.outcome}` : ''}`}>
                    {h.total}
                  </span>
                  <span>{h.label ?? h.detail}</span>
                  <span className="history__src">{h.source}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
