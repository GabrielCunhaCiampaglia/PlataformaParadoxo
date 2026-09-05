import type { PandoraDef } from './types.js';

/**
 * PANDORA, página 5 do PDF: traumas, doenças e fobias.
 *
 * O rodapé do PDF é explícito em que a lista é EXEMPLO, não catálogo fechado:
 *   "Esses listados não são só os únicos, são apenas exemplos. Cada Trauma,
 *    Doença ou Fobia pode ser personalizada e surgir na hora da sessão."
 *
 * ❓ S6: o PDF afirma que "tudo que há em Pandora reflete no valor das perícias"
 * e não quantifica nenhuma penalidade. Por isso não há campo de efeito aqui.
 */
export const PANDORA: PandoraDef[] = [
  { id: 'amnesia-dissociativa', label: 'AMNÉSIA DISSOCIATIVA', tipo: 'trauma', texto: 'Perda de memória causada por trauma extremo.' },
  { id: 'depressao-psicotica', label: 'DEPRESSÃO PSICÓTICA', tipo: 'trauma', texto: 'Estado depressivo severo com delírios e paranóia.' },
  { id: 'despersonalizacao', label: 'DESPERSONALIZAÇÃO', tipo: 'trauma', texto: 'Sensação de estar desconectado do próprio corpo ou mente.' },
  { id: 'desrealizacao', label: 'DESREALIZAÇÃO', tipo: 'trauma', texto: 'Percepção de que o mundo ao redor não é real.' },
  { id: 'mutismo-seletivo', label: 'MUTISMO SELETIVO', tipo: 'trauma', texto: 'Incapacidade de falar em situações específicas devido a trauma.' },
  { id: 'remorso', label: 'REMORSO', tipo: 'trauma', texto: 'Inquietação, abatimento da consciência que percebe ter cometido uma falta, um erro; arrependimento, remordimento.' },
  { id: 'sindrome-do-sobrevivente', label: 'SÍNDROME DO SOBREVIVENTE', tipo: 'trauma', texto: 'Culpa intensa por ter sobrevivido quando outros morreram.' },
  { id: 'transtorno-de-estresse-pos-traumatico', label: 'TRANSTORNO DE ESTRESSE PÓS-TRAUMÁTICO (TEPT)', tipo: 'trauma', texto: 'Após eventos traumáticos, causando pesadelos, flashbacks e hipervigilância.' },
  { id: 'transtorno-de-panico', label: 'TRANSTORNO DE PÂNICO', tipo: 'trauma', texto: 'Ataques súbitos de terror, sem causa aparente.' },
  { id: 'transtorno-dissociativo-de-identidade', label: 'TRANSTORNO DISSOCIATIVO DE IDENTIDADE (TDI)', tipo: 'trauma', texto: 'Desenvolvimento de múltiplas personalidades como mecanismo de defesa.' },
  { id: 'ansiedade', label: 'ANSIEDADE', tipo: 'doenca', texto: 'Preocupação intensa, excessiva e persistente e medo de situações cotidianas.' },
  { id: 'depressao', label: 'DEPRESSÃO', tipo: 'doenca', texto: 'Alterações de humor, tristeza profunda e perda de interesse em atividades que antes eram prazerosas.' },
  { id: 'doenca-de-huntington', label: 'DOENÇA DE HUNTINGTON', tipo: 'doenca', texto: 'Distúrbio neurodegenerativo que afeta o controle motor e mental.' },
  { id: 'esclerose-lateral-amiotrofica', label: 'ESCLEROSE LATERAL AMIOTRÓFICA (ELA)', tipo: 'doenca', texto: 'Degeneração dos neurônios motores, levando à paralisia.' },
  { id: 'fibromialgia', label: 'FIBROMIALGIA', tipo: 'doenca', texto: 'Causa dores crônicas pelo corpo sem uma causa específica.' },
  { id: 'insonia-fatal-familiar', label: 'INSÔNIA FATAL FAMILIAR', tipo: 'doenca', texto: 'Doença rara que impede o sono e causa morte em poucos meses.' },
  { id: 'sindrome-de-capgras', label: 'SÍNDROME DE CAPGRAS', tipo: 'doenca', texto: 'Crença de que pessoas próximas foram substituídas por impostores.' },
  { id: 'sindrome-de-cotard', label: 'SÍNDROME DE COTARD', tipo: 'doenca', texto: 'Transtorno mental no qual a pessoa acredita estar morta ou sem órgãos internos.' },
  { id: 'sindrome-de-estocolmo', label: 'SÍNDROME DE ESTOCOLMO', tipo: 'doenca', texto: 'A vítima pode desenvolver sentimentos positivos em relação ao agressor, como simpatia, empatia ou amor.' },
  { id: 'sindrome-de-guillain-barre', label: 'SÍNDROME DE GUILLAIN-BARRÉ', tipo: 'doenca', texto: 'Sistema imunológico ataca os nervos, causando paralisia.' },
  { id: 'sindrome-de-marfan', label: 'SÍNDROME DE MARFAN', tipo: 'doenca', texto: 'Afeta o tecido conjuntivo, tornando os ossos e órgãos frágeis.' },
  { id: 'aicmofobia', label: 'AICMOFOBIA', tipo: 'fobia', texto: 'Medo de agulhas ou objetos pontiagudos.' },
  { id: 'agorafobia', label: 'AGORAFOBIA', tipo: 'fobia', texto: 'Medo de espaços abertos ou multidões.' },
  { id: 'atelofobia', label: 'ATELOFOBIA', tipo: 'fobia', texto: 'Medo de imperfeição ou de não ser bom o suficiente.' },
  { id: 'catoptrofobia', label: 'CATOPTROFOBIA', tipo: 'fobia', texto: 'Medo de espelhos e reflexos.' },
  { id: 'claustrofobia', label: 'CLAUSTROFOBIA', tipo: 'fobia', texto: 'Medo extremo de lugares fechados.' },
  { id: 'hematofobia', label: 'HEMATOFOBIA', tipo: 'fobia', texto: 'Medo de sangue.' },
  { id: 'hodofobia', label: 'HODOFOBIA', tipo: 'fobia', texto: 'Medo de viajar ou se deslocar.' },
  { id: 'nictofobia', label: 'NICTOFOBIA', tipo: 'fobia', texto: 'Medo intenso do escuro.' },
  { id: 'tafefobia', label: 'TAFEFOBIA', tipo: 'fobia', texto: 'Medo de ser enterrado vivo.' },
  { id: 'thanatofobia', label: 'THANATOFOBIA', tipo: 'fobia', texto: 'Medo intenso da morte ou do processo de morrer.' },
];
