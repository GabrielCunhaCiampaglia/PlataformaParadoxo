import type { ResourceDef, SkillDef } from './types.js';

/**
 * As 33 perícias, na ordem impressa na página 2 da ficha.
 *
 * A ordem importa: é alfabética EXCETO por ESCUDO antes de ENCONTRAR, que está
 * fora de ordem no PDF. Mantida como impressa para que o jogador com a ficha de
 * papel na mão ache a linha no mesmo lugar.
 */
export const PERICIAS: SkillDef[] = [
  { id: 'adestramento', label: 'Adestramento' },
  { id: 'agilidade', label: 'Agilidade' },
  { id: 'artes', label: 'Artes' },
  { id: 'ataque', label: 'Ataque' },
  { id: 'carisma', label: 'Carisma' },
  { id: 'ciencias', label: 'Ciências' },
  { id: 'combate', label: 'Combate' },
  { id: 'coragem', label: 'Coragem' },
  { id: 'credulidade', label: 'Credulidade' },
  { id: 'criatividade', label: 'Criatividade' },
  { id: 'crime', label: 'Crime' },
  { id: 'disfarce', label: 'Disfarce' },
  { id: 'escudo', label: 'Escudo' },
  { id: 'encontrar', label: 'Encontrar' },
  { id: 'forca', label: 'Força' },
  { id: 'furtividade', label: 'Furtividade' },
  { id: 'iniciativa', label: 'Iniciativa' },
  { id: 'intimidacao', label: 'Intimidação' },
  { id: 'intuicao', label: 'Intuição' },
  { id: 'investigacao', label: 'Investigação' },
  { id: 'labia', label: 'Lábia' },
  // Impressa em VERMELHO na ficha, sozinha entre as 33. O PDF não explica o
  // destaque. VIVAÇO cita "rolar Lutar pela Vida 2 vezes", o que sugere uma
  // rolagem de morte iminente. → S18
  { id: 'lutar-pela-vida', label: 'Lutar pela Vida', destaque: true },
  { id: 'mana', label: 'Mana' },
  { id: 'medicina', label: 'Medicina' },
  { id: 'memoria', label: 'Memória' },
  { id: 'mira', label: 'Mira' },
  { id: 'ocultismo', label: 'Ocultismo' },
  { id: 'pilotagem', label: 'Pilotagem' },
  { id: 'reflexo', label: 'Reflexo' },
  { id: 'resistencia', label: 'Resistência' },
  { id: 'sorte', label: 'Sorte' },
  { id: 'sobrevivencia', label: 'Sobrevivência' },
  { id: 'tecnologia', label: 'Tecnologia' },
];

/**
 * Duas entradas que a ficha imprime com a MESMA estrutura de perícia
 * (`[pontos]+[bônus]=[total]`), mas fora da lista das 33 — encostadas nas
 * linhas de Ataque e Coragem.
 *
 * - `ataque-de-tiro` é citada pelo traço SOMBRA DO CHUMBO ("Perícia de Ataque
 *   Tiro muda o valor para 90"), o que confirma que é perícia. → S1
 * - `sanidade` é ao mesmo tempo RECURSO (com "Atual" no topo da ficha) e uma
 *   linha rolável aqui. VIRTUOSO dá "+10 pontos em sanidade" e "pode rolar
 *   Sanidade com vantagem", confirmando que se rola. → S19
 */
export const PERICIAS_EXTRAS: SkillDef[] = [
  { id: 'ataque-de-tiro', label: 'Ataque de Tiro', extra: true },
  { id: 'sanidade', label: 'Sanidade', extra: true },
];

/** Tudo que é rolável como perícia: as 33 impressas mais as 2 extras. */
export const TODAS_AS_PERICIAS: SkillDef[] = [...PERICIAS, ...PERICIAS_EXTRAS];

/**
 * Os cinco recursos do topo da ficha. O PDF imprime só o campo "Atual" —
 * não há máximo impresso para nenhum, exceto o teto do Contato com o Oculto.
 * ❓ S12: valores iniciais e máximos não constam.
 */
export const RECURSOS: ResourceDef[] = [
  { id: 'vida', label: 'Vida', curto: 'Vida', nota: 'Traços alteram a base: Vivaço +15, Coração de Ferro +25' },
  {
    id: 'psicologico',
    label: 'Psicológico / Sanidade',
    curto: 'Sanidade',
    nota: 'Perder 5 ou mais numa sessão obriga a adquirir algo de Pandora',
  },
  { id: 'energia', label: 'Energia', curto: 'Energia', nota: 'O PDF não diz como é gasta nem recuperada' },
  { id: 'mana', label: 'Mana', curto: 'Mana', nota: 'Também existe como perícia; a relação não está definida' },
  {
    id: 'contato-oculto',
    label: 'Contato com o Oculto',
    curto: 'Oculto',
    hardMax: 99,
    nota: 'Não pode chegar a 100. Cada gatilho de Pandora soma +20',
  },
];
