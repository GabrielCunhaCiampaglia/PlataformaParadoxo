import { TODOS_OS_TRACOS } from './traits.js';
import { TODAS_AS_PERICIAS } from './skills.js';
import {
  BASE_PERICIA,
  ESPACOS_POR_BOLSO,
  PONTOS_PARA_DISTRIBUIR,
  TETO_COM_TRACO,
  TETO_DISTRIBUICAO,
  LOTES_DE_TRACO,
} from './rules.js';
import type { CharacterSheet, TraitDef } from './types.js';

export interface SkillTotal {
  id: string;
  label: string;
  /** Sempre 45. Explícito para a ficha poder mostrar a conta inteira. */
  base: number;
  pontos: number;
  bonus: number;
  /** O valor que vai para o d100. */
  total: number;
  /** `true` quando o teto de 85 cortou pontos que o jogador havia posto. */
  limitado: boolean;
  /** Preenchido quando um traço FIXA o total, ignorando a soma. */
  fixadoPor?: string;
}

function tracosDe(ids: string[]): TraitDef[] {
  return ids
    .map((id) => TODOS_OS_TRACOS.find((t) => t.id === id))
    .filter((t): t is TraitDef => t !== undefined);
}

/**
 * Calcula o TOTAL de cada perícia a partir da ficha preenchida.
 *
 * A ordem das regras é a da página 3 do PDF e não é intercambiável:
 *   1. base 45
 *   2. + pontos distribuídos
 *   3. + bônus de traço (incluindo o +15 geral do Aprendiz)
 *   4. corta em 85
 *   5. traço que FIXA valor (Berserkers, Vingador…) sobrescreve tudo, inclusive
 *      o teto — é o que os põe em 90 e 95. Ver S21.
 */
export function derivarPericias(ficha: CharacterSheet): SkillTotal[] {
  const tracos = tracosDe(ficha.tracos);

  const bonusPorPericia = new Map<string, number>();
  const fixos = new Map<string, { valor: number; traco: string }>();

  for (const traco of tracos) {
    for (const efeito of traco.efeitos) {
      if (efeito.kind === 'skillBonus') {
        bonusPorPericia.set(efeito.skill, (bonusPorPericia.get(efeito.skill) ?? 0) + efeito.amount);
      } else if (efeito.kind === 'allSkillsBonus') {
        for (const p of TODAS_AS_PERICIAS) {
          bonusPorPericia.set(p.id, (bonusPorPericia.get(p.id) ?? 0) + efeito.amount);
        }
      } else if (efeito.kind === 'skillSet') {
        // Se dois traços fixam a mesma perícia, o maior vence. O PDF não trata
        // o caso (Visão do Futuro e Voz do Éter fixam Intuição em 90 os dois),
        // e pegar o maior é o único critério que não depende da ordem da lista.
        const atual = fixos.get(efeito.skill);
        if (!atual || efeito.value > atual.valor) {
          fixos.set(efeito.skill, { valor: efeito.value, traco: traco.label });
        }
      }
    }
  }

  return TODAS_AS_PERICIAS.map((p) => {
    const estado = ficha.skills[p.id];
    const pontos = estado?.pontos ?? 0;
    const bonus = bonusPorPericia.get(p.id) ?? 0;
    const bruto = BASE_PERICIA + pontos + bonus;
    const fixo = fixos.get(p.id);

    if (fixo) {
      return {
        id: p.id,
        label: p.label,
        base: BASE_PERICIA,
        pontos,
        bonus,
        total: fixo.valor,
        limitado: false,
        fixadoPor: fixo.traco,
      };
    }

    return {
      id: p.id,
      label: p.label,
      base: BASE_PERICIA,
      pontos,
      bonus,
      total: Math.min(bruto, TETO_COM_TRACO),
      limitado: bruto > TETO_COM_TRACO,
    };
  });
}

export interface ValidacaoDaFicha {
  ok: boolean;
  pontosGastos: number;
  pontosRestantes: number;
  erros: string[];
  avisos: string[];
}

/**
 * Valida a distribuição inicial contra as regras impressas.
 *
 * Não valida o que o PDF não fecha: não desconta o custo das Habilidades dos
 * 231 pontos, porque S3 continua em aberto.
 */
export function validarDistribuicao(ficha: CharacterSheet): ValidacaoDaFicha {
  const erros: string[] = [];
  const avisos: string[] = [];

  let pontosGastos = 0;
  for (const p of TODAS_AS_PERICIAS) {
    const pontos = ficha.skills[p.id]?.pontos ?? 0;
    if (pontos < 0) erros.push(`${p.label}: pontos negativos (${pontos}).`);
    pontosGastos += pontos;

    // O teto de 70 é sobre o VALOR da perícia na distribuição inicial, não
    // sobre os pontos soltos: base 45 + 25 pontos = 70.
    const valorInicial = BASE_PERICIA + pontos;
    if (valorInicial > TETO_DISTRIBUICAO) {
      erros.push(
        `${p.label}: ${valorInicial} passa do máximo de ${TETO_DISTRIBUICAO} na distribuição inicial.`,
      );
    }
  }

  if (pontosGastos > PONTOS_PARA_DISTRIBUIR) {
    erros.push(`Gastou ${pontosGastos} de ${PONTOS_PARA_DISTRIBUIR} pontos.`);
  }

  // "É estritamente proibido juntar pontos, você deve usa-los." (página 3)
  const restantes = PONTOS_PARA_DISTRIBUIR - pontosGastos;
  if (restantes > 0) {
    avisos.push(`Sobraram ${restantes} pontos. A ficha proíbe guardar pontos.`);
  }

  if (ficha.tracos.length > LOTES_DE_TRACO) {
    avisos.push(
      `${ficha.tracos.length} traços marcados; a ficha tem ${LOTES_DE_TRACO} lotes. Consultar o Mestre.`,
    );
  }

  if (!ficha.classe) avisos.push('Nenhuma classe escolhida.');

  for (const p of derivarPericias(ficha)) {
    if (p.limitado) {
      avisos.push(`${p.label} bateu no teto de ${TETO_COM_TRACO}; os pontos excedentes devem ir para outra perícia.`);
    }
  }

  return { ok: erros.length === 0, pontosGastos, pontosRestantes: restantes, erros, avisos };
}

/** Espaços ocupados e disponíveis. "1 BOLSO = 2 ESPAÇOS" (página 2). */
export function calcularCarga(ficha: CharacterSheet): {
  ocupadoMochila: number;
  ocupadoBolso: number;
  capacidadeBolso: number;
} {
  let ocupadoMochila = 0;
  let ocupadoBolso = 0;
  for (const item of ficha.inventario) {
    if (item.local === 'bolso') ocupadoBolso += item.espacos;
    else ocupadoMochila += item.espacos;
  }
  return {
    ocupadoMochila,
    ocupadoBolso,
    capacidadeBolso: ficha.bolsos * ESPACOS_POR_BOLSO,
  };
}

/** Ficha vazia e válida, com todas as perícias na base 45. */
export function fichaVazia(): CharacterSheet {
  const skills: CharacterSheet['skills'] = {};
  for (const p of TODAS_AS_PERICIAS) skills[p.id] = { pontos: 0, bonus: 0 };
  return {
    identidade: {},
    recursos: {},
    skills,
    tracos: [],
    habilidades: [],
    inventario: [],
    bolsos: 0,
  };
}
