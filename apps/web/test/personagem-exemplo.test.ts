import { describe, expect, it } from 'vitest';
import { PONTOS_PARA_DISTRIBUIR, derivarPericias, validarDistribuicao } from '@paradoxo/sheet';
import { personagemExemplo } from '../src/personagem-exemplo.js';

/**
 * O personagem de demonstração aparece na tela do cliente. Se ele violar as
 * regras do próprio sistema, o painel passa a ensinar a coisa errada — por isso
 * ele é testado como se fosse ficha de jogador.
 */
describe('Personagem de demonstração', () => {
  const ficha = personagemExemplo();

  it('é uma distribuição válida, sem erro nem ponto sobrando', () => {
    const v = validarDistribuicao(ficha);
    expect(v.erros).toEqual([]);
    expect(v.ok).toBe(true);
    expect(v.pontosGastos).toBe(PONTOS_PARA_DISTRIBUIR);
    expect(v.pontosRestantes).toBe(0);
  });

  it('preenche os quatro lotes de traço, nem mais nem menos', () => {
    expect(ficha.tracos).toHaveLength(4);
    expect(new Set(ficha.tracos).size).toBe(4);
  });

  it('nenhuma perícia passa do teto de 85 depois dos bônus', () => {
    for (const p of derivarPericias(ficha)) expect(p.total).toBeLessThanOrEqual(85);
  });

  it('os bônus dos traços realmente chegam nas perícias', () => {
    const porId = new Map(derivarPericias(ficha).map((p) => [p.id, p]));
    // Curioso (+10) e Perspicaz (+8) empilham em Encontrar.
    expect(porId.get('encontrar')?.bonus).toBe(18);
    // Curioso soma +10 em Investigação; 45 base + 25 pontos + 10 = 80.
    expect(porId.get('investigacao')?.total).toBe(80);
  });

  it('respeita a capacidade dos bolsos declarada', () => {
    const noBolso = ficha.inventario
      .filter((i) => i.local === 'bolso')
      .reduce((s, i) => s + i.espacos, 0);
    expect(noBolso).toBeLessThanOrEqual(ficha.bolsos * 2);
  });
});
