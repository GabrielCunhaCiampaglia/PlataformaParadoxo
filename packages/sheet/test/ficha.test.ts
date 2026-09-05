import { describe, expect, it } from 'vitest';
import {
  BASE_PERICIA,
  CATALOGO,
  CLASSES,
  CUSTO_TOTAL_HABILIDADES,
  PANDORA,
  PERICIAS,
  PERICIAS_EXTRAS,
  PONTOS_PARA_DISTRIBUIR,
  TABELA_DE_DANO,
  TETO_COM_TRACO,
  TETO_DISTRIBUICAO,
  TODAS_AS_PERICIAS,
  TODOS_OS_TRACOS,
  TRACOS_BLOQUEADOS,
  TRACOS_LIBERADOS,
  calcularCarga,
  derivarPericias,
  fichaVazia,
  validarDistribuicao,
} from '../src/index.js';

/** Atalho: ficha vazia com pontos e traços aplicados. */
function ficha(pontos: Record<string, number> = {}, tracos: string[] = []) {
  const f = fichaVazia();
  for (const [id, p] of Object.entries(pontos)) f.skills[id] = { pontos: p, bonus: 0 };
  f.tracos = tracos;
  return f;
}

function total(f: ReturnType<typeof ficha>, id: string) {
  const p = derivarPericias(f).find((s) => s.id === id);
  if (!p) throw new Error(`perícia ${id} não existe`);
  return p;
}

describe('Estrutura da ficha, conferida contra o PDF', () => {
  it('tem exatamente as 33 perícias impressas, mais as 2 extras', () => {
    expect(PERICIAS).toHaveLength(33);
    expect(PERICIAS_EXTRAS).toHaveLength(2);
    expect(TODAS_AS_PERICIAS).toHaveLength(35);
  });

  it('não repete id de perícia', () => {
    const ids = TODAS_AS_PERICIAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tem 31 traços liberados e 12 bloqueados', () => {
    expect(TRACOS_LIBERADOS).toHaveLength(31);
    expect(TRACOS_BLOQUEADOS).toHaveLength(12);
  });

  it('tem 6 classes e 17 linhas de dano', () => {
    expect(CLASSES).toHaveLength(6);
    expect(TABELA_DE_DANO).toHaveLength(17);
  });

  it('todo efeito de traço aponta para uma perícia que existe', () => {
    const ids = new Set(TODAS_AS_PERICIAS.map((p) => p.id));
    for (const traco of TODOS_OS_TRACOS) {
      for (const efeito of traco.efeitos) {
        if (efeito.kind === 'skillBonus' || efeito.kind === 'skillSet') {
          expect(ids, `${traco.label} aponta para "${efeito.skill}"`).toContain(efeito.skill);
        }
      }
    }
  });

  it('os 4 lotes de habilidade somam 60 pontos', () => {
    expect(CUSTO_TOTAL_HABILIDADES).toBe(60);
  });
});

describe('Base 45 — a regra que resolve S2', () => {
  it('perícia sem pontos nem bônus vale 45, não 0', () => {
    expect(total(ficha(), 'forca').total).toBe(BASE_PERICIA);
  });

  it('o exemplo literal da página 7 fecha: 45 em Força', () => {
    // "Se o personagem tem 45 em Força, ele precisa tirar 45 ou menos no D100."
    expect(total(ficha(), 'forca').total).toBe(45);
  });

  it('os 231 pontos são distribuídos ACIMA da base', () => {
    // Se fossem o total, 33 perícias dariam 7 cada. Com base 45, 231 pontos
    // sobem 33 perícias em 7 cada, chegando a 52 — abaixo do teto de 70.
    const cada = Math.floor(PONTOS_PARA_DISTRIBUIR / PERICIAS.length);
    expect(BASE_PERICIA + cada).toBeLessThanOrEqual(TETO_DISTRIBUICAO);
  });
});

describe('Tetos', () => {
  it('aceita exatamente 70 na distribuição inicial', () => {
    const v = validarDistribuicao(ficha({ mira: 25 }));
    expect(v.erros).toEqual([]);
    expect(total(ficha({ mira: 25 }), 'mira').total).toBe(70);
  });

  it('recusa 71 na distribuição inicial', () => {
    const v = validarDistribuicao(ficha({ mira: 26 }));
    expect(v.ok).toBe(false);
    expect(v.erros[0]).toContain('71');
  });

  it('corta em 85 quando o traço empurra além, e avisa', () => {
    // 45 base + 25 pontos + 25 do Zoolover = 95 bruto → 85.
    const f = ficha({ adestramento: 25 }, ['zoolover']);
    const p = total(f, 'adestramento');
    expect(p.total).toBe(TETO_COM_TRACO);
    expect(p.limitado).toBe(true);
    expect(validarDistribuicao(f).avisos.some((a) => a.includes('teto'))).toBe(true);
  });

  it('recusa gastar mais de 231 pontos', () => {
    const v = validarDistribuicao(ficha({ mira: 25, forca: 25, agilidade: 25, ataque: 25, escudo: 25, crime: 25, artes: 25, sorte: 25, carisma: 25, labia: 25 }));
    expect(v.pontosGastos).toBe(250);
    expect(v.ok).toBe(false);
  });

  it('avisa quando sobram pontos, porque a ficha proíbe guardar', () => {
    expect(validarDistribuicao(ficha({ mira: 10 })).avisos.some((a) => a.includes('Sobraram'))).toBe(
      true,
    );
  });
});

describe('Traços', () => {
  it('Aprendiz soma +15 em todas as perícias, extras incluídas', () => {
    const f = ficha({}, ['aprendiz']);
    for (const p of derivarPericias(f)) expect(p.total).toBe(60);
  });

  it('Atleta soma nas duas perícias que cita', () => {
    const f = ficha({}, ['atleta']);
    expect(total(f, 'agilidade').total).toBe(50);
    expect(total(f, 'forca').total).toBe(51);
  });

  it('Virtuoso cai na PERÍCIA Sanidade, não no recurso', () => {
    expect(total(ficha({}, ['virtuoso']), 'sanidade').total).toBe(55);
  });

  it('Vivaço não mexe em perícia nenhuma além de Lutar pela Vida', () => {
    const f = ficha({}, ['vivaco']);
    expect(total(f, 'lutar-pela-vida').total).toBe(65);
    expect(total(f, 'forca').total).toBe(45);
  });

  it('Berserkers FIXA 95 e rompe o teto de 85 — a contradição S21', () => {
    const f = ficha({}, ['berserkers']);
    for (const id of ['forca', 'escudo', 'ataque', 'reflexo']) {
      const p = total(f, id);
      expect(p.total).toBe(95);
      expect(p.total).toBeGreaterThan(TETO_COM_TRACO);
      expect(p.fixadoPor).toBe('Berserkers');
    }
    // Não vaza para as outras.
    expect(total(f, 'mira').total).toBe(45);
  });

  it('traço que fixa ignora os pontos distribuídos', () => {
    expect(total(ficha({ adestramento: 25 }, ['lider-dos-caidos']), 'adestramento').total).toBe(95);
  });

  it('dois traços fixando a mesma perícia não somam', () => {
    // Visão do Futuro e Voz do Éter fixam Intuição em 90 os dois.
    const f = ficha({}, ['visao-do-futuro', 'voz-do-eter']);
    expect(total(f, 'intuicao').total).toBe(90);
  });

  it('Sombra do Chumbo alcança a perícia extra Ataque de Tiro', () => {
    expect(total(ficha({}, ['sombra-do-chumbo']), 'ataque-de-tiro').total).toBe(90);
  });
});

describe('Catálogo — o que S14 tinha errado', () => {
  it('tem 72 itens e nenhum preço negativo', () => {
    expect(CATALOGO).toHaveLength(72);
    for (const i of CATALOGO) expect(i.preco).toBeGreaterThanOrEqual(0);
  });

  it('todo equipamento tem peso e nenhum remédio tem', () => {
    for (const i of CATALOGO) {
      if (i.categoria === 'equipamento') expect(i.peso, i.nome).not.toBeNull();
      else expect(i.peso, i.nome).toBeNull();
    }
  });

  it('os preços que a extração antiga embaralhou agora batem com o PDF', () => {
    const preco = (nome: string) => CATALOGO.find((i) => i.nome === nome)?.preco;
    expect(preco('CORDA (10 METROS)')).toBe(58.95);
    expect(preco('LANTERNA')).toBe(13.16);
    expect(preco('MINI FACA')).toBe(60.5);
    expect(preco('KARAMBIT')).toBe(126.32);
    expect(preco('COLETE À PROVA DE BALAS')).toBe(3947.37);
    expect(preco('DRONE')).toBe(3088.16);
  });

  it('nenhum cabeçalho de seção virou item', () => {
    const nomes = CATALOGO.map((i) => i.nome);
    expect(nomes).not.toContain('TRANSTORNOS PSICOLÓGICOS');
    expect(nomes).not.toContain('DOENÇAS NEUROLÓGICAS E FÍSICAS');
    expect(nomes).not.toContain('COMBATE E DEFESA');
  });

  it('a Bíblia é de graça — o único item com preço zero', () => {
    expect(CATALOGO.filter((i) => i.preco === 0).map((i) => i.nome)).toEqual(['BÍBLIA']);
  });

  it('o escudo balístico não cabe em mochila nenhuma pela escala da ficha', () => {
    // Peso 40 contra o maior degrau da legenda, que é 10. É o que sustenta S15.
    const escudo = CATALOGO.find((i) => i.nome === 'ESCUDO BALÍSTICO');
    expect(escudo?.peso).toBe(40);
  });
});

describe('PANDORA', () => {
  it('tem 31 condições sem id repetido', () => {
    expect(PANDORA).toHaveLength(31);
    expect(new Set(PANDORA.map((p) => p.id)).size).toBe(31);
  });

  it('cobre os três tipos', () => {
    const tipos = new Set(PANDORA.map((p) => p.tipo));
    expect([...tipos].sort()).toEqual(['doenca', 'fobia', 'trauma']);
  });
});

describe('Carga', () => {
  it('1 bolso vale 2 espaços', () => {
    const f = fichaVazia();
    f.bolsos = 3;
    f.inventario = [
      { nome: 'Faca', espacos: 4, local: 'mochila' },
      { nome: 'Munição', espacos: 1, local: 'bolso' },
    ];
    const c = calcularCarga(f);
    expect(c.capacidadeBolso).toBe(6);
    expect(c.ocupadoMochila).toBe(4);
    expect(c.ocupadoBolso).toBe(1);
  });
});
