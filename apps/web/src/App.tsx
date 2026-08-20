import {
  PARADOXO_EPIFANICO_V1 as RULESET,
  rollAction,
  rollDamage,
  type RollResult,
} from '@paradoxo/rules';
import { useCallback, useEffect, useRef, useState } from 'react';

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

export default function App() {
  const [tab, setTab] = useState<Tab>('acao');
  const [skill, setSkill] = useState('');
  const [sides, setSides] = useState(6);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<RollResult | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [nonce, setNonce] = useState(0);

  // O updater precisa ser PURO: o StrictMode o executa duas vezes em dev, e
  // gravar no localStorage lá dentro duplicava entradas. A persistência mora
  // num efeito, e o id vem de um contador — Date.now() colide em cliques rápidos.
  const nextId = useRef(0);

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

  function doAction() {
    const parsed = skill.trim() === '' ? null : Number.parseInt(skill, 10);
    const value = parsed !== null && Number.isInteger(parsed) ? parsed : null;

    const r = rollAction(RULESET, { skill: value });
    setResult(r);
    setLabel(r.label);
    setOutcome(r.outcome);
    setNonce((n) => n + 1);

    push({
      total: r.total,
      detail: `${r.dice[0]!.value} + ${r.dice[1]!.value}`,
      source: value === null ? 'livre' : `perícia ${value}`,
      outcome: r.outcome,
      label: r.label,
    });
  }

  function doDamage() {
    const r = rollDamage(RULESET, { sides, quantity });
    setResult(r);
    setLabel(null);
    setOutcome(null);
    setNonce((n) => n + 1);

    push({
      total: r.total,
      detail: r.dice.map((d) => d.value).join(' + '),
      source: r.expression,
      outcome: null,
      label: null,
    });
  }

  function clearHistory() {
    setHistory([]); // o efeito acima grava a lista vazia
  }

  const outcomeClass = outcome ? `o-${outcome}` : '';

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <main className="app">
        <header className="brand">
          <span className="brand__dot" />
          Paradoxo Epifânico
          <span className="brand__ver">Prévia</span>
        </header>

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
              <button className="btn" type="button" onClick={doAction}>
                Rolar d100
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
                    max={100}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
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
              <button className="btn" type="button" onClick={doDamage}>
                Rolar dano
              </button>
            </>
          )}

          <div className="result" aria-live="polite">
            {result ? (
              <div key={nonce} className="reveal">
                <p className="result__dice">
                  {result.kind === 'action'
                    ? `${result.dice[0]!.value} + ${result.dice[1]!.value}`
                    : result.dice.map((d) => d.value).join(' + ')}
                </p>
                <p className={`result__total ${outcomeClass}`}>{result.total}</p>
                {label ? <p className={`result__label ${outcomeClass}`}>{label}</p> : null}
              </div>
            ) : (
              <p className="result__empty">Aguardando rolagem</p>
            )}
          </div>
        </section>

        {history.length > 0 ? (
          <section className="panel history">
            <div className="history__head">
              <span className="history__title">Histórico</span>
              <button className="linkbtn" type="button" onClick={clearHistory}>
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

        <p className="note">
          Prévia técnica. A rolagem 3D, as contas e a ficha ainda não estão aqui — o histórico
          é local e some se você limpar o navegador.
        </p>
      </main>
    </>
  );
}
