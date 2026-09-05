import type { ClassDef, DamageEntry, TreatmentDef } from './types.js';

/**
 * As seis classes da página 4. "Só poderá escolher uma classe."
 *
 * ❓ S5: nenhuma delas tem efeito numérico impresso. O texto é conceito e
 * direção de interpretação. Não há campo de efeito por isso.
 */
export const CLASSES: ClassDef[] = [
  {
    id: 'colosso',
    label: 'Colosso',
    texto:
      'Com uma resistência física incomparável, é capaz de suportar os ataques mais brutais, protegendo seus aliados com coragem inabalável. Especialista em força física e absorção de dano, ele se posiciona entre o perigo e sua equipe, garantindo que os outros possam agir com segurança.',
  },
  {
    id: 'investigador',
    label: 'Investigador',
    texto:
      'Curioso e furtivo, o Investigador combina inteligência com ação. Ele resolve enigmas, analisa situações complexas e aborda combates com frieza e planejamento. Sempre focado em desvendar o que aconteceu e completando as missões, é a escolha para quem gosta de solucionar problemas e liderar missões com lógica e calma.',
  },
  {
    id: 'kraftor',
    label: 'Kraftor',
    texto:
      'Manipuladores da mana, os Kraftor receberam a bênção em meio ao caos, a energia adentrou em seu sangue, a mana na pura forma que o ser humano viu no terror da Terra. Eles extraem o poder bruto da Krafta, moldando-a em habilidades de ataque.',
  },
  {
    id: 'laminar',
    label: 'Laminar',
    texto:
      'Rápido, e letal. O mestre do combate corpo a corpo. Suas lâminas, armas improvisadas são ferramentas de destruição em curtas distâncias. Focado em eliminar os inimigos com brutalidade ou elegância, ele é perfeito para quem prefere ação intensa e visceral.',
  },
  {
    id: 'ocultista',
    label: 'Ocultista',
    texto:
      'É o caminho entre o mundo humano e o sobrenatural. Com uma conexão profunda com a Krafta, na sua forma mais suja, em rituais, ele a manipula para desvendar mistérios e obter vantagens.',
  },
  {
    id: 'sentinela',
    label: 'Sentinela',
    texto:
      'O Sentinela domina o campo de batalha à distância. Com olhos sempre atentos e precisão impecável, ele transforma o caos em ordem com seus disparos certeiros e estratégias calculadas. Especialista em visão ampliada, é ideal para quem prefere eliminar ameaças antes que elas se aproximem.',
  },
];

/**
 * Tabela de VALORES DE DANO da página 4.
 *
 * Rodapé, literal: "Esses danos são somente os AA (Auto-Ataques), o dano das
 * habilidades não tem nada a ver com essa tabela, mesmo que seja usado os itens
 * na tabela. O dano pode variar de acordo com a especificação da cena."
 *
 * Quatro linhas NÃO são roláveis sem arbitragem e estão marcadas:
 *  - "+ Acessórios" não define de onde vem o número (→ C2).
 *  - "1d6 + 1d100 Resistência" mistura dados e cita uma perícia sem dizer a
 *    operação (soma? comparação? teste oposto? → R7).
 *  - "AG = 1d10 / AP = 1d6" usa duas siglas que o PDF nunca define (→ S22).
 */
export const TABELA_DE_DANO: DamageEntry[] = [
  { id: 'arcos', label: 'Arcos', formula: '2d10' },
  { id: 'armas-de-fogo-grandes', label: 'Armas de fogo grandes', formula: '2d20' },
  { id: 'armas-de-fogo-pequenas', label: 'Armas de fogo pequenas', formula: '1d20' },
  {
    id: 'bastao',
    label: 'Bastão',
    formula: '1d10 + Acessórios',
    precisaArbitragem: true,
    nota: 'O PDF não define de onde vem o valor de "Acessórios"',
  },
  {
    id: 'cabecada',
    label: 'Cabeçada',
    formula: '1d6 + 1d100 Resistência',
    precisaArbitragem: true,
    nota: 'Mistura dados e cita a perícia Resistência sem definir a operação',
  },
  { id: 'chute', label: 'Chute', formula: '1d3' },
  {
    id: 'coronhada',
    label: 'Coronhada',
    formula: 'AG = 1d10 / AP = 1d6',
    precisaArbitragem: true,
    nota: 'AG e AP não são definidos em lugar nenhum do PDF',
  },
  {
    id: 'enforcada',
    label: 'Enforcada',
    formula: '1d6 + 1d100 Resistência',
    precisaArbitragem: true,
    nota: 'Mistura dados e cita a perícia Resistência sem definir a operação',
  },
  { id: 'espadas', label: 'Espadas', formula: '1d10' },
  { id: 'facas', label: 'Facas', formula: '1d6' },
  { id: 'joelhada', label: 'Joelhada', formula: '1d3' },
  { id: 'krafta', label: 'Krafta', formula: '1d20' },
  { id: 'machados', label: 'Machados', formula: '2d20' },
  {
    id: 'mordida',
    label: 'Mordida',
    formula: '1d6 + 1d100 Sanidade',
    precisaArbitragem: true,
    nota: 'Mistura dados e cita Sanidade sem definir a operação',
  },
  { id: 'pedras', label: 'Pedras', formula: '1d6' },
  {
    id: 'soco',
    label: 'Soco',
    formula: '1d3 + Acessórios',
    precisaArbitragem: true,
    nota: 'O PDF não define de onde vem o valor de "Acessórios"',
  },
  { id: 'vidros', label: 'Vidros', formula: '1d10' },
];

/**
 * Tratamentos médicos da página 6. Os três curam "com vantagem" — a mesma
 * palavra que o PDF nunca define mecanicamente (→ S10).
 */
export const TRATAMENTOS: TreatmentDef[] = [
  {
    id: 'leve',
    label: 'Tratamento leve',
    preco: 100,
    cura: '1d6',
    texto:
      'Pequenos curativos, analgésicos e procedimentos simples para cortes e contusões. Restauram 1d6 do valor da Vida com vantagem.',
  },
  {
    id: 'moderado',
    label: 'Tratamento moderado',
    preco: 200,
    cura: '1d10',
    texto:
      'Cuidados mais avançados, incluindo pontos, imobilizações e medicamentos especializados. Útil para lesões mais sérias, como fraturas menores e infecções. Restauram 1d10 da Vida com vantagem.',
  },
  {
    id: 'grave',
    label: 'Tratamento grave',
    preco: 500,
    cura: '1d20',
    texto:
      'Procedimentos complexos, como cirurgias emergenciais, transfusões de sangue e reabilitação de ferimentos críticos. Essencial para personagens à beira da morte. Restauram 1d20 da Vida com vantagem.',
  },
];
