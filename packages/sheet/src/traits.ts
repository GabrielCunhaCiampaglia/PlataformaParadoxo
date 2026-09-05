import type { TraitDef } from './types.js';

/**
 * Traços, página 3 do PDF, transcritos com o texto literal.
 *
 * `efeitos` contém APENAS o que o PDF quantifica em número. Tudo que é
 * narrativo ("pode pular os dados e ir direto ao destino") fica só em `texto`,
 * para o Mestre arbitrar — o motor não inventa mecânica.
 *
 * ⚠️ Duas inconsistências de origem, preservadas e anotadas:
 *  - SEDE DE SANGUE aparece na lista detalhada da página 3 mas NÃO na relação
 *    de traços liberados da capa. São 31 detalhados contra 30 na capa. → S20
 *  - A capa escreve "MÃOS DE FIOS"; a página 3 escreve "MÃO DE FIOS". → S20
 */
export const TRACOS_LIBERADOS: TraitDef[] = [
  {
    id: 'arisco-no-piloto',
    label: 'Arisco no Piloto',
    tier: 'liberado',
    texto:
      '+15 pontos na perícia Pilotagem. Pode pular os dados e ir direto ao destino, sem risco nenhum de pista.',
    efeitos: [{ kind: 'skillBonus', skill: 'pilotagem', amount: 15 }],
  },
  {
    id: 'atleta',
    label: 'Atleta',
    tier: 'liberado',
    texto:
      '+5 pontos na perícia Agilidade e +6 em Força. Não gasta ação para pular/atravessar obstáculos.',
    efeitos: [
      { kind: 'skillBonus', skill: 'agilidade', amount: 5 },
      { kind: 'skillBonus', skill: 'forca', amount: 6 },
    ],
  },
  {
    id: 'caixa-preta',
    label: 'Caixa Preta',
    tier: 'liberado',
    texto: '+20 pontos na perícia Memória. Ganha uma câmera fotográfica que não ocupa espaço.',
    efeitos: [{ kind: 'skillBonus', skill: 'memoria', amount: 20 }],
  },
  {
    id: 'cleptomaniaco',
    label: 'Cleptomaníaco',
    tier: 'liberado',
    texto:
      '+15 pontos na perícia Crime. Tem vantagem em furtar ou manipular pequenos objetos sem ser percebido.',
    efeitos: [{ kind: 'skillBonus', skill: 'crime', amount: 15 }],
    concedeVantagem: true,
  },
  {
    id: 'couraca',
    label: 'Couraça',
    tier: 'liberado',
    texto: '+20 pontos na perícia Resistência. Reduz o dano em 5 pontos em cada ataque recebido.',
    efeitos: [{ kind: 'skillBonus', skill: 'resistencia', amount: 20 }],
  },
  {
    id: 'crenca',
    label: 'Crença',
    tier: 'liberado',
    texto:
      '+25 pontos na perícia Credulidade. Pode manter a sanidade sob os efeitos do oculto ou manipulação mágica.',
    efeitos: [{ kind: 'skillBonus', skill: 'credulidade', amount: 25 }],
  },
  {
    id: 'curioso',
    label: 'Curioso',
    tier: 'liberado',
    texto:
      '+10 pontos na perícia Encontrar e +10 pontos na perícia Investigação. Descobre pistas adicionais em áreas importantes com um teste bom.',
    efeitos: [
      { kind: 'skillBonus', skill: 'encontrar', amount: 10 },
      { kind: 'skillBonus', skill: 'investigacao', amount: 10 },
    ],
  },
  {
    id: 'desbravador',
    label: 'Desbravador',
    tier: 'liberado',
    texto:
      '+20 pontos na perícia Sobrevivência. Pode localizar suprimentos e abrigo em ambientes hostis e insalubres com facilidade.',
    efeitos: [{ kind: 'skillBonus', skill: 'sobrevivencia', amount: 20 }],
  },
  {
    id: 'desenhista',
    label: 'Desenhista',
    tier: 'liberado',
    texto:
      '+25 pontos na perícia Artes. Ganha um papel e caneta que não ocupa espaço, além de ter vantagem em Artes.',
    efeitos: [{ kind: 'skillBonus', skill: 'artes', amount: 25 }],
    concedeVantagem: true,
  },
  {
    id: 'doutor',
    label: 'Doutor',
    tier: 'liberado',
    texto:
      '+10 pontos na perícia Medicina. Cura com mais eficiência, restaurando mais 5 pontos de vida adicional por tratamento.',
    efeitos: [{ kind: 'skillBonus', skill: 'medicina', amount: 10 }],
  },
  {
    id: 'erratico',
    label: 'Errático',
    tier: 'liberado',
    texto: '+10 pontos na perícia Reflexo. Pode esquivar e contra atacar com vantagem dos ataques.',
    efeitos: [{ kind: 'skillBonus', skill: 'reflexo', amount: 10 }],
    concedeVantagem: true,
  },
  {
    id: 'farsante',
    label: 'Farsante',
    tier: 'liberado',
    texto:
      '+20 pontos na perícia Disfarce e +8 pontos em Lábia. Assume identidades falsas com uma máscara que não ocupa espaço.',
    efeitos: [
      { kind: 'skillBonus', skill: 'disfarce', amount: 20 },
      { kind: 'skillBonus', skill: 'labia', amount: 8 },
    ],
  },
  {
    id: 'furtivo',
    label: 'Furtivo',
    tier: 'liberado',
    texto: '+10 pontos na perícia Furtividade. Concede o triplo de vantagem ao ataque furtivo.',
    efeitos: [{ kind: 'skillBonus', skill: 'furtividade', amount: 10 }],
    concedeVantagem: true,
  },
  {
    id: 'inovador',
    label: 'Inovador',
    tier: 'liberado',
    texto: '+15 pontos na perícia Criatividade. Consegue criar ferramentas ou itens com vantagem.',
    efeitos: [{ kind: 'skillBonus', skill: 'criatividade', amount: 15 }],
    concedeVantagem: true,
  },
  {
    id: 'linguas',
    label: 'Línguas',
    tier: 'liberado',
    texto:
      '+20 pontos na perícia Ocultismo. Compreende línguas do oculto e de toda espécie após uma breve exposição.',
    efeitos: [{ kind: 'skillBonus', skill: 'ocultismo', amount: 20 }],
  },
  {
    id: 'mao-de-fios',
    label: 'Mão de Fios',
    tier: 'liberado',
    texto:
      '+15 pontos na perícia Lábia e +8 pontos em Carisma. Pode manipular e mentir com vantagem.',
    efeitos: [
      { kind: 'skillBonus', skill: 'labia', amount: 15 },
      { kind: 'skillBonus', skill: 'carisma', amount: 8 },
    ],
    concedeVantagem: true,
  },
  {
    id: 'mira-laser',
    label: 'Mira Laser',
    tier: 'liberado',
    texto:
      '+15 pontos na perícia Mira. Realiza os ataques a distância com vantagem e acrescenta um movimento caso inimigo fora de mira.',
    efeitos: [{ kind: 'skillBonus', skill: 'mira', amount: 15 }],
    concedeVantagem: true,
  },
  {
    id: 'sede-de-sangue',
    label: 'Sede de Sangue',
    tier: 'liberado',
    texto:
      '+20 pontos na perícia Ocultismo. Rituais executados ao estender as mãos, sem nenhum ingrediente.',
    efeitos: [{ kind: 'skillBonus', skill: 'ocultismo', amount: 20 }],
  },
  {
    id: 'perspicaz',
    label: 'Perspicaz',
    tier: 'liberado',
    texto:
      '+8 pontos na perícia Encontrar e +10 pontos em Intuição. Pode achar informações importantes em locais aleatórios.',
    efeitos: [
      { kind: 'skillBonus', skill: 'encontrar', amount: 8 },
      { kind: 'skillBonus', skill: 'intuicao', amount: 10 },
    ],
  },
  {
    id: 'por-todos',
    label: 'Por Todos',
    tier: 'liberado',
    texto:
      '+10 pontos na perícia Escudo. Após rolar Escudo para proteger quem importa, ganha +3 pontos de vida, caso perca.',
    efeitos: [{ kind: 'skillBonus', skill: 'escudo', amount: 10 }],
  },
  {
    id: 'programador',
    label: 'Programador',
    tier: 'liberado',
    texto:
      '+20 pontos na perícia Tecnologia. Pode invadir sistemas digitais de qualquer local e manipular eletrônicos com seu pen-drive.',
    efeitos: [{ kind: 'skillBonus', skill: 'tecnologia', amount: 20 }],
  },
  {
    id: 'quebra-ossos',
    label: 'Quebra-Ossos',
    tier: 'liberado',
    texto:
      '+10 pontos na perícia Ataque e +10 em Força. Realiza ataques corpo a corpo com mais 10 de dano base.',
    efeitos: [
      { kind: 'skillBonus', skill: 'ataque', amount: 10 },
      { kind: 'skillBonus', skill: 'forca', amount: 10 },
    ],
  },
  {
    id: 'seguro-de-si',
    label: 'Seguro de Si',
    tier: 'liberado',
    texto:
      '+20 pontos na perícia Carisma e +8 em Lábia. Ignora efeitos de intimidação ou manipulação mental.',
    efeitos: [
      { kind: 'skillBonus', skill: 'carisma', amount: 20 },
      { kind: 'skillBonus', skill: 'labia', amount: 8 },
    ],
  },
  {
    id: 'sexto-sentido',
    label: 'Sexto Sentido',
    tier: 'liberado',
    texto: '+20 pontos na perícia Intuição. Descobre mentiras e disfarces com vantagem no dado.',
    efeitos: [{ kind: 'skillBonus', skill: 'intuicao', amount: 20 }],
    concedeVantagem: true,
  },
  {
    id: 'so-vive-uma-vez',
    label: 'Só Vive Uma Vez',
    tier: 'liberado',
    texto:
      '+20 pontos na perícia Sorte e +20 em Coragem. Uma vez por sessão pode, re-rolar um dado ruim.',
    efeitos: [
      { kind: 'skillBonus', skill: 'sorte', amount: 20 },
      { kind: 'skillBonus', skill: 'coragem', amount: 20 },
    ],
  },
  {
    id: 'estrategico',
    label: 'Estratégico',
    tier: 'liberado',
    texto: '+18 pontos na perícia Iniciativa. Vantagem nas duas primeiras ações.',
    efeitos: [{ kind: 'skillBonus', skill: 'iniciativa', amount: 18 }],
    concedeVantagem: true,
  },
  {
    id: 'tigre',
    label: 'Tigre',
    tier: 'liberado',
    texto:
      '+20 pontos na perícia Intimidação. Pode sair de combates apenas colocando o inimigo para correr (não funciona com boss).',
    efeitos: [{ kind: 'skillBonus', skill: 'intimidacao', amount: 20 }],
  },
  {
    id: 'velocista',
    label: 'Velocista',
    tier: 'liberado',
    texto:
      '+10 pontos na perícia Agilidade. Move-se rapidamente, podendo realizar 2 ações adicionais de deslocamento.',
    efeitos: [{ kind: 'skillBonus', skill: 'agilidade', amount: 10 }],
  },
  {
    id: 'vivaco',
    label: 'Vivaço',
    tier: 'liberado',
    texto:
      '+15 pontos na Vida base e +20 pontos em Lutar pela Vida. Consegue rolar Lutar pela Vida 2 vezes no RPG.',
    efeitos: [
      { kind: 'resourceBase', resource: 'vida', amount: 15 },
      { kind: 'skillBonus', skill: 'lutar-pela-vida', amount: 20 },
    ],
  },
  {
    id: 'virtuoso',
    label: 'Virtuoso',
    tier: 'liberado',
    texto: '+10 pontos em sanidade. Pode rolar Sanidade com vantagem.',
    // "+10 pontos em sanidade" com "pode ROLAR Sanidade" na mesma frase: o bônus
    // é na perícia Sanidade, não no recurso. É a evidência mais forte de que a
    // linha extra da página 2 é uma perícia de verdade. → S19
    efeitos: [{ kind: 'skillBonus', skill: 'sanidade', amount: 10 }],
    concedeVantagem: true,
  },
  {
    id: 'zoolover',
    label: 'Zoolover',
    tier: 'liberado',
    texto:
      '+25 pontos na perícia Adestramento. Pode acalmar ou influenciar a ação de animais ao redor com vantagem no dado.',
    efeitos: [{ kind: 'skillBonus', skill: 'adestramento', amount: 25 }],
    concedeVantagem: true,
  },
];

/**
 * Traços bloqueados, liberados durante a campanha pelo Mestre.
 *
 * Quatro deles usam `skillSet` em vez de somar: fixam o TOTAL da perícia num
 * valor. Isso ROMPE o teto de 85 da página 3 — Berserkers põe quatro perícias
 * em 95. O PDF não reconcilia as duas regras. → S21
 */
export const TRACOS_BLOQUEADOS: TraitDef[] = [
  {
    id: 'aprendiz',
    label: 'Aprendiz',
    tier: 'bloqueado',
    texto: '+15 pontos em todas as perícias. Aprendeu de tudo um pouco rapidinho, né?',
    efeitos: [{ kind: 'allSkillsBonus', amount: 15 }],
  },
  {
    id: 'berserkers',
    label: 'Berserkers',
    tier: 'bloqueado',
    texto:
      'Perícia de Força, Escudo, Ataque e Reflexos mudam o valor para 95 pontos. Ninguém se quer pode controlar sua fúria.',
    efeitos: [
      { kind: 'skillSet', skill: 'forca', value: 95 },
      { kind: 'skillSet', skill: 'escudo', value: 95 },
      { kind: 'skillSet', skill: 'ataque', value: 95 },
      { kind: 'skillSet', skill: 'reflexo', value: 95 },
    ],
  },
  {
    id: 'comandante',
    label: 'Comandante',
    tier: 'bloqueado',
    texto:
      '+30 pontos na perícia Iniciativa. Após teste normal no dado, o grupo todo faz o que você quiser, sem consentimento.',
    efeitos: [{ kind: 'skillBonus', skill: 'iniciativa', amount: 30 }],
  },
  {
    id: 'coracao-de-ferro',
    label: 'Coração de Ferro',
    tier: 'bloqueado',
    texto: '+25 pontos base em Vida. Regeneração de 3 de vida após cada ataque.',
    efeitos: [{ kind: 'resourceBase', resource: 'vida', amount: 25 }],
  },
  {
    id: 'intelecto-ancestral',
    label: 'Intelecto Ancestral',
    tier: 'bloqueado',
    texto: 'Direito a saber qualquer coisa que esteja querendo aprender ou descobrir.',
    efeitos: [],
  },
  {
    id: 'lider-dos-caidos',
    label: 'Líder dos Caídos',
    tier: 'bloqueado',
    texto:
      'Perícia de Adestramento muda o valor para 95 pontos. Capaz de comandar qualquer ser irracional existente.',
    efeitos: [{ kind: 'skillSet', skill: 'adestramento', value: 95 }],
  },
  {
    id: 'luminar',
    label: 'Luminar',
    tier: 'bloqueado',
    texto:
      'Desperta mana pura capaz de curar qualquer coisa que tocar, e também, regenerar em 15 pontos de Vida.',
    efeitos: [],
  },
  {
    id: 'sombra-do-chumbo',
    label: 'Sombra do Chumbo',
    tier: 'bloqueado',
    texto: 'Perícia de Ataque Tiro muda o valor para 90 pontos. Vantagem tripla no dado de Mira.',
    efeitos: [{ kind: 'skillSet', skill: 'ataque-de-tiro', value: 90 }],
    concedeVantagem: true,
  },
  {
    id: 'transcendente',
    label: 'Transcendente',
    tier: 'bloqueado',
    texto: 'Forma não humana capaz de capacidades únicas. Após adquirir, consultar o Mestre.',
    efeitos: [],
  },
  {
    id: 'visao-do-futuro',
    label: 'Visão do Futuro',
    tier: 'bloqueado',
    texto: 'Perícia de Intuição muda o valor para 90 pontos. Pode prever ações rolando intuição com vantagem.',
    efeitos: [{ kind: 'skillSet', skill: 'intuicao', value: 90 }],
    concedeVantagem: true,
  },
  {
    id: 'vingador',
    label: 'Vingador',
    tier: 'bloqueado',
    texto:
      'Perícia de Agilidade e Ataque mudam o valor para 90 pontos. Pode ganhar mais uma ação a cada kill que fizer com vantagem.',
    efeitos: [
      { kind: 'skillSet', skill: 'agilidade', value: 90 },
      { kind: 'skillSet', skill: 'ataque', value: 90 },
    ],
    concedeVantagem: true,
  },
  {
    id: 'voz-do-eter',
    label: 'Voz do Éter',
    tier: 'bloqueado',
    texto:
      'Perícia de Intuição muda o valor para 90 pontos. Ouve vozes do oculto a todo instante, lhe dizendo o caminho para a verdade.',
    // Efeito numérico IDÊNTICO ao de Visão do Futuro. Ter os dois não soma. → S21
    efeitos: [{ kind: 'skillSet', skill: 'intuicao', value: 90 }],
  },
];

export const TODOS_OS_TRACOS: TraitDef[] = [...TRACOS_LIBERADOS, ...TRACOS_BLOQUEADOS];
