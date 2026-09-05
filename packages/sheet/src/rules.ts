/**
 * Constantes numéricas da criação de personagem, todas com a citação do PDF
 * que as sustenta. Nenhum número aqui é escolha nossa.
 */

/**
 * Página 7, "EXPLICAÇÃO DO SISTEMA":
 *   "Cada personagem possui perícias com valores numéricos (sempre acima de
 *    45 ou 45) que representam suas chances de sucesso."
 *
 * É o que resolve S2: os 231 pontos NÃO são o total das perícias, são o que se
 * distribui ACIMA desta base. 231 ÷ 33 = 7 nunca fez sentido porque a conta
 * partia do zero.
 */
export const BASE_PERICIA = 45;

/** Página 2: "Distribuir 231 pontos. Máximo de 70 em uma perícia." */
export const PONTOS_PARA_DISTRIBUIR = 231;

/** Teto na distribuição inicial, antes de qualquer bônus de traço. */
export const TETO_DISTRIBUICAO = 70;

/**
 * Página 3, rodapé:
 *   "Caso o ponto do traço seja acrescentado e passar de 85, deverá manter o
 *    número 85, pois é o máximo que poderá ser evoluído tal perícia. Mas nosso
 *    sistema não deixará seus pontos serem jogados fora (...) você poderá
 *    acrescentar em outras perícias até conseguir gastar todos que sobraram.
 *    É estritamente proibido juntar pontos, você deve usa-los."
 */
export const TETO_COM_TRACO = 85;

/** Página 1: "só será preenchido os 4 lotes" — os hexágonos de prioridade. */
export const LOTES_DE_TRACO = 4;

/**
 * Página 2, coluna HABILIDADES. Quatro lotes com custo impresso:
 * ataque −10, defesa −15, ataque −10, ultimate −25. Soma −60.
 *
 * ❓ S3: o PDF não diz se estes 60 saem dos 231 ou de um orçamento à parte.
 * Por isso o custo é exportado como dado, e nenhuma validação o desconta.
 */
export const SLOTS_HABILIDADE = [
  { ordem: 1, tipo: 'ataque', custo: 10 },
  { ordem: 2, tipo: 'defesa', custo: 15 },
  { ordem: 3, tipo: 'ataque', custo: 10 },
  { ordem: 4, tipo: 'ultimate', custo: 25 },
] as const;

export const CUSTO_TOTAL_HABILIDADES = SLOTS_HABILIDADE.reduce((s, h) => s + h.custo, 0);

/** Página 2, cabeçalho do inventário: "1 BOLSO = 2 ESPAÇOS". */
export const ESPACOS_POR_BOLSO = 2;

/**
 * Página 2, legenda do inventário. São faixas de referência, não uma tabela
 * fechada: "Consulte o mestre. Os itens citados são exemplos, eles podem
 * variar ocupação."
 */
export const FAIXAS_DE_TAMANHO = [
  { id: 'pequeno', label: 'Pequeno', min: 1, max: 1, exemplos: 'Remédios, munição, chaves, papéis, carteira' },
  { id: 'medio', label: 'Médio', min: 2, max: 3, exemplos: 'Adagas, livros, pequenas ferramentas' },
  { id: 'grande', label: 'Grande', min: 4, max: 6, exemplos: 'Arcos, suprimentos, armas de pequeno porte' },
  { id: 'muito-grande', label: 'Muito grande', min: 8, max: 10, exemplos: 'Armas de grande porte, espadas' },
] as const;

/**
 * Página 1 e página 5: "Ao perder 5 (cinco) ou mais de Sanidade, o jogador
 * deverá adquirir algo de PANDORA. A cada 5 (cinco) percas de sanidade, o
 * jogador deverá adquirir uma doença e ganhar 20 pontos de contato com o
 * oculto (+20)."
 */
export const PANDORA_GATILHO_SANIDADE = 5;
export const PANDORA_CONTATO_OCULTO_POR_GATILHO = 20;

/** Página 1: "Não poderá chegar em 100." */
export const CONTATO_OCULTO_TETO_EXCLUSIVO = 100;
