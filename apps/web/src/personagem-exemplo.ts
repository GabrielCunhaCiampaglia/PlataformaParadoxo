import { fichaVazia, type CharacterSheet } from '@paradoxo/sheet';

/**
 * Personagem de demonstração.
 *
 * Existe porque não há banco: a Fase 1 (Supabase, contas, mesa) ainda não foi
 * feita, e um painel de ficha vazio não mostra se o layout aguenta conteúdo
 * real. Sai do código no dia em que a ficha vier do servidor.
 *
 * A distribuição abaixo é VÁLIDA contra as regras do PDF: gasta os 231 pontos
 * inteiros, nenhuma perícia passa de 70 na distribuição inicial, e os quatro
 * lotes de traço estão preenchidos. `validarDistribuicao` cobre isso em teste.
 */
export function personagemExemplo(): CharacterSheet {
  const f = fichaVazia();

  f.identidade = {
    jogador: 'Gabriel',
    personagem: 'Íris Valdek',
    patente: 'Sargento',
    apelido: 'Corvo',
    afiliacao: 'Resiliência',
    idade: '31',
    genero: 'Feminino',
    nacionalidade: 'Canadense',
    altura: '1,71 m',
    peso: '64 kg',
    salario: '$ 2.400 CAD',
    profissaoAnterior: 'Paramédica',
    motivacao: 'Encontrar a irmã levada em Nunavut',
  };

  f.classe = 'investigador';

  f.recursos = {
    vida: 75,
    psicologico: 60,
    energia: 40,
    mana: 15,
    'contato-oculto': 20,
  };

  // 231 pontos exatos, todos acima da base 45 e nenhum acima de 25 (teto 70).
  const distribuicao: Record<string, number> = {
    investigacao: 25,
    encontrar: 25,
    medicina: 25,
    intuicao: 20,
    furtividade: 20,
    mira: 20,
    reflexo: 15,
    agilidade: 15,
    memoria: 15,
    coragem: 12,
    'lutar-pela-vida': 12,
    resistencia: 10,
    tecnologia: 9,
    sobrevivencia: 8,
  };
  for (const [id, pontos] of Object.entries(distribuicao)) f.skills[id] = { pontos, bonus: 0 };

  f.tracos = ['curioso', 'doutor', 'perspicaz', 'so-vive-uma-vez'];

  f.habilidades = ['Tiro de contenção', 'Cobertura móvel', 'Marcação', 'Última luz'];

  f.bolsos = 3;
  f.inventario = [
    { nome: 'Kit de primeiros socorros', espacos: 3, local: 'mochila' },
    { nome: 'Pistola Glock 17 (9mm)', espacos: 5, local: 'mochila' },
    { nome: 'Lanterna UV luz negra', espacos: 3, local: 'mochila' },
    { nome: 'Bloco de notas', espacos: 3, local: 'mochila' },
    { nome: 'Munição diversa (30 und)', espacos: 5, local: 'mochila' },
    { nome: 'Caneta preta', espacos: 1, local: 'bolso' },
    { nome: 'Mini faca', espacos: 3, local: 'bolso' },
  ];

  return f;
}
