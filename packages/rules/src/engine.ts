import { evaluateCondition } from './expression.js';
import {
  RulesError,
  type ActionResult,
  type DamageResult,
  type DieRoll,
  type RNG,
  type Ruleset,
} from './types.js';

const defaultRng: RNG = Math.random;

/** Inteiro uniforme em [1, sides]. */
function rollDie(sides: number, rng: RNG): number {
  return Math.floor(rng() * sides) + 1;
}

/**
 * Rola 1d100 como DOIS d10 percentuais — dezenas e unidades — que é a prática
 * física de mesa e o que a rolagem 3D mostra (ADR-0010, doc 08 §2.1).
 *
 * O d10 de dezenas mostra 00, 10 … 90 e o de unidades 0 … 9.
 * A combinação 00 + 0 vale 100. A distribuição resultante é uniforme em [1, 100].
 */
export function rollPercentile(rng: RNG = defaultRng): { dice: DieRoll[]; total: number } {
  const tens = Math.floor(rng() * 10); // 0..9  →  00..90
  const units = Math.floor(rng() * 10); // 0..9
  const total = tens === 0 && units === 0 ? 100 : tens * 10 + units;

  return {
    dice: [
      { sides: 10, value: tens * 10, role: 'tens' },
      { sides: 10, value: units, role: 'units' },
    ],
    total,
  };
}

export interface ActionInput {
  /** Valor da Perícia, de 1 a 100. `null` para rolagem livre. */
  skill?: number | null;
}

/**
 * Rolagem de Ação: d100 contra Perícia.
 *
 * Sem Perícia (`skill` nulo) e com `onMissingSkill: 'raw'`, devolve o número sem
 * interpretar — é a rolagem livre confirmada em 19/08/2026.
 */
export function rollAction(
  ruleset: Ruleset,
  input: ActionInput = {},
  rng: RNG = defaultRng,
): ActionResult {
  const skill = input.skill ?? null;

  if (skill !== null) {
    if (!Number.isInteger(skill)) {
      throw new RulesError('A Perícia precisa ser um número inteiro');
    }
    if (skill < 0) {
      throw new RulesError('A Perícia não pode ser negativa');
    }
  }

  const { dice, total } = rollPercentile(rng);

  const base: Omit<ActionResult, 'outcome' | 'label' | 'color'> = {
    kind: 'action',
    expression: '1d100',
    dice,
    total,
    targetValue: skill,
  };

  const interpret = skill !== null || ruleset.action.onMissingSkill === 'fail';
  if (!interpret) {
    return { ...base, outcome: null, label: null, color: null };
  }

  // Com `onMissingSkill: 'fail'` e sem perícia, reproduz o NaN do protótipo:
  // nenhuma comparação numérica passa, então cai na última faixa.
  const scope = { roll: total, skill: skill ?? Number.NaN };

  for (const band of ruleset.action.bands) {
    let matched: boolean;
    try {
      matched = evaluateCondition(band.when, scope);
    } catch {
      // Comparação contra NaN nunca casa; qualquer outro erro também não deve
      // derrubar a rolagem inteira — segue para a próxima faixa.
      matched = false;
    }
    if (matched) {
      return { ...base, outcome: band.id, label: band.label, color: band.color };
    }
  }

  throw new RulesError(
    'Nenhuma faixa casou. A última faixa do ruleset deve ter a condição "true".',
  );
}

export interface DamageInput {
  sides: number;
  quantity: number;
}

/** Rolagem de Dano: N dados iguais, somados. */
export function rollDamage(
  ruleset: Ruleset,
  input: DamageInput,
  rng: RNG = defaultRng,
): DamageResult {
  const { sides, quantity } = input;

  if (!ruleset.damage.dice.includes(sides)) {
    throw new RulesError(`O dado D${sides} não faz parte do catálogo do sistema`);
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RulesError('A quantidade de dados precisa ser um inteiro maior que zero');
  }
  if (quantity > 100) {
    throw new RulesError('A quantidade de dados não pode passar de 100');
  }

  const dice: DieRoll[] = [];
  let total = 0;
  for (let i = 0; i < quantity; i++) {
    const value = rollDie(sides, rng);
    dice.push({ sides, value });
    total += value;
  }

  return { kind: 'damage', expression: `${quantity}d${sides}`, dice, total };
}
