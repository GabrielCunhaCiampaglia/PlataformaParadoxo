import type { Ruleset } from './types.js';

/**
 * Ruleset oficial do Paradoxo Epifânico.
 *
 * Confirmado pelo autor do sistema em 19/08/2026:
 *   - a comparação é `<=`  (rolar exatamente a Perícia é SUCESSO)
 *   - o limiar de Sucesso Bom arredonda PARA CIMA
 *   - a rolagem sem Perícia é livre e não é interpretada
 *
 * O protótipo original usava `<` e não arredondava, o que o tornava mais severo
 * do que o sistema pretende. Ver docs/02-regras-do-sistema.md §1.2.
 *
 * `bands` é ORDENADA: a primeira condição verdadeira vence, exatamente como o
 * if/else do rolador original. Adicionar Falha Crítica (R4) ou um quarto grau de
 * sucesso (R5) é inserir um item nesta lista — não mexer em código.
 */
export const PARADOXO_EPIFANICO_V1: Ruleset = {
  name: 'Paradoxo Epifânico',
  version: 1,
  action: {
    die: 100,
    bands: [
      { id: 'extreme', label: 'Extremo!', when: 'roll == 1', color: 'extreme' },
      { id: 'disaster', label: 'Desastre!', when: 'roll == 100', color: 'disaster' },
      { id: 'good', label: 'Sucesso Bom', when: 'roll <= ceil(skill / 2)', color: 'good' },
      { id: 'normal', label: 'Sucesso Normal', when: 'roll <= skill', color: 'normal' },
      { id: 'fail', label: 'Falha', when: 'true', color: 'fail' },
    ],
    onMissingSkill: 'raw',
  },
  damage: {
    // Sem D12: o sistema não usa. Confirmar em C1.
    dice: [2, 3, 4, 6, 8, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    allowModifier: false, // → C2
    allowMixedDice: false, // → C5
  },
};
