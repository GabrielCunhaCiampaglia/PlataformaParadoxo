/**
 * Tipos da ficha do Paradoxo Epifânico.
 *
 * Tudo aqui é derivado do PDF oficial em `docs/fontes/paradoxo-epifanico-ficha.pdf`
 * e documentado em `docs/09-ficha-e-sistema.md`. Onde o PDF não diz, o tipo deixa
 * o campo opcional em vez de presumir um valor — presumir é o que transforma
 * lacuna do sistema em bug silencioso do produto.
 */

/** Uma das 33 perícias impressas na ficha, roladas em d100. */
export interface SkillDef {
  /** Chave estável. Nunca muda, mesmo que o rótulo mude. */
  id: string;
  /** Como aparece impresso na ficha. */
  label: string;
  /**
   * `true` para as duas entradas que a ficha imprime FORA da lista das 33,
   * com a mesma estrutura `[pontos]+[bônus]=[total]`: Ataque de Tiro e Sanidade.
   * Ver doc 09 §3.2 e a pergunta S1.
   */
  extra?: boolean;
  /** A ficha imprime esta perícia em vermelho, sem explicar por quê (S18). */
  destaque?: boolean;
}

/** Os cinco recursos do topo da ficha. Cada um tem apenas "Atual" impresso. */
export interface ResourceDef {
  id: string;
  label: string;
  /** Rótulo curto, para a fileira de medidores onde não cabe o nome inteiro. */
  curto: string;
  /** Teto rígido confirmado no PDF. Só "Contato com o Oculto" tem um. */
  hardMax?: number;
  nota?: string;
}

/** Efeito mecânico de um traço sobre uma perícia ou recurso. */
export type TraitEffect =
  /** Soma ao campo "Bônus" da perícia. */
  | { kind: 'skillBonus'; skill: string; amount: number }
  /** Fixa o TOTAL da perícia num valor, ignorando pontos e bônus. */
  | { kind: 'skillSet'; skill: string; value: number }
  /** Soma a todas as 33 perícias de uma vez (só APRENDIZ faz isso). */
  | { kind: 'allSkillsBonus'; amount: number }
  /** Soma à base de um recurso (VIVAÇO e CORAÇÃO DE FERRO, na Vida). */
  | { kind: 'resourceBase'; resource: string; amount: number };

export interface TraitDef {
  id: string;
  label: string;
  tier: 'liberado' | 'bloqueado';
  /** Texto literal do PDF, sem edição. É a fonte para o Mestre arbitrar. */
  texto: string;
  /** Só os efeitos que o PDF quantifica. O resto fica em `texto`. */
  efeitos: TraitEffect[];
  /**
   * `true` quando o traço concede "vantagem" — que o PDF cita 11 vezes e
   * nunca define mecanicamente. Ver pergunta S10.
   */
  concedeVantagem?: boolean;
}

export interface ClassDef {
  id: string;
  label: string;
  texto: string;
}

/** Uma linha da tabela de auto-ataque (AA) da ficha. */
export interface DamageEntry {
  id: string;
  label: string;
  /** Expressão como impressa. Nem toda linha é rolável sem arbitragem. */
  formula: string;
  /** `true` quando a fórmula depende de algo que o PDF não fecha. */
  precisaArbitragem?: boolean;
  nota?: string;
}

export interface CatalogItem {
  nome: string;
  grupo: string;
  categoria: 'remedio' | 'equipamento';
  /** Em dólares canadenses. O mundo do PE usa $ CAD. */
  preco: number;
  /**
   * O catálogo rotula esta coluna como PESO; a área de inventário da ficha
   * rotula como ESPAÇOS. Ver pergunta S8 — tratamos como a mesma grandeza,
   * mas a contradição não está resolvida.
   */
  peso: number | null;
}

export interface TreatmentDef {
  id: string;
  label: string;
  preco: number;
  cura: string;
  texto: string;
}

/** Condição de PANDORA: trauma, doença ou fobia. */
export interface PandoraDef {
  id: string;
  label: string;
  tipo: 'trauma' | 'doenca' | 'fobia';
  texto: string;
}

/** Estado preenchido de uma perícia na ficha de um personagem. */
export interface SkillState {
  /** Pontos distribuídos pelo jogador, acima da base. */
  pontos: number;
  /** Soma dos bônus de traço. Derivado, não digitado. */
  bonus: number;
}

export interface CharacterSheet {
  identidade: Record<string, string>;
  recursos: Record<string, number>;
  skills: Record<string, SkillState>;
  tracos: string[];
  classe?: string;
  habilidades: string[];
  inventario: InventoryEntry[];
  bolsos: number;
}

export interface InventoryEntry {
  nome: string;
  espacos: number;
  local: 'mochila' | 'bolso';
}
