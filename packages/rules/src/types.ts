/** Fonte de aleatoriedade. Injetada para que os testes possam semear. */
export type RNG = () => number;

export interface Band {
  /** Identificador estável, gravado em `roll.outcome`. */
  id: string;
  label: string;
  /** Condição na gramática fechada de `expression.ts`. Contexto: `roll`, `skill`. */
  when: string;
  /** Token semântico do design system, não uma cor literal. */
  color: string;
}

export interface ActionConfig {
  die: number;
  /** Lista ORDENADA: a primeira condição verdadeira vence. */
  bands: Band[];
  /**
   * O que fazer quando não há Perícia vinculada.
   * `raw` — rolagem livre: mostra o número, sem interpretar. (confirmado 19/08/2026)
   * `fail` — comportamento acidental do protótipo, mantido só por compatibilidade.
   */
  onMissingSkill: 'raw' | 'fail';
}

export interface DamageConfig {
  dice: number[];
  allowModifier: boolean;
  allowMixedDice: boolean;
  /**
   * Ids de faixa da Rolagem de Ação que MAXIMIZAM o dano em vez de rolá-lo.
   * Ficha oficial: no Extremo (1), o dano é o máximo do dado. Ver doc 09 §9.3.
   */
  maximizeOnOutcome: string[];
}

export interface Ruleset {
  name: string;
  version: number;
  action: ActionConfig;
  damage: DamageConfig;
}

/** Um dado individual como ele aparece na mesa. */
export interface DieRoll {
  /** Número de faces do sólido rolado. */
  sides: number;
  /** Valor mostrado na face. Para o d10 de dezenas do percentual: 0, 10, 20 … 90. */
  value: number;
  /** Rótulo do papel do dado, quando ele tem um. */
  role?: 'tens' | 'units';
}

export interface ActionResult {
  kind: 'action';
  expression: string;
  /** Os dois d10 do percentual, na ordem dezenas, unidades. */
  dice: DieRoll[];
  /** Resultado composto, de 1 a 100. */
  total: number;
  targetValue: number | null;
  /** `Band.id`, ou null na rolagem livre. */
  outcome: string | null;
  label: string | null;
  color: string | null;
}

export interface DamageResult {
  kind: 'damage';
  expression: string;
  dice: DieRoll[];
  total: number;
}

export type RollResult = ActionResult | DamageResult;

export class RulesError extends Error {
  override readonly name = 'RulesError';
}
