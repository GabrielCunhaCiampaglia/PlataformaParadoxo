# ADR-0010 — Rolagem 3D: three.js imperativo + cannon-es, com rotulagem pós-simulação

**Data:** 2026-08-19 · **Status:** Aceita — PoC Dias 1 e 2 aprovados em 20/08/2026 (0,002% de degeneração em 50.000 simulações). Falta o Dia 3, em Android real.

## Contexto

O cliente exige que a rolagem seja "bonita, premium, com boa visualização e utilização, e o
mais importante ser 3D — os dados vão realmente rolar".

Duas restrições do projeto tornam essa decisão menos óbvia do que parece:

1. **O resultado vem do motor de regras, não da física** ([ADR-0006](0006-motor-de-regras.md)).
   Toda rolagem é gravada com os valores individuais, a perícia alvo e a versão da regra,
   para ser auditável. A animação precisa **chegar** no número que o motor já decidiu.
2. **Metade do catálogo não existe como sólido justo.** O sistema pede D2, D3, D4, D6, D8,
   D10, D20, D30, D40, D50, D60, D70, D80, D90 e D100. D2, D3, D40, D50, D70, D80 e D90 não
   têm poliedro justo correspondente, e o D100 só existe como Zocchihedron, que rola mal.
   A rolagem **mais frequente** do sistema é justamente o d100.

Somam-se o aparelho real de uso — Android intermediário, na mesa, por 3 a 4 horas — e o
fato de o protótipo do cliente **já carregar three.js** para o shader `ColorBends`.

## Alternativas avaliadas

| Alternativa | Delta de bundle (gz) | Veredito |
|---|---|---|
| `@3d-dice/dice-box` | ~1.145 KB | **Incompatível.** Ver abaixo |
| React Three Fiber + `@react-three/rapier` | ~890 KB (1.142 KB na variante determinística) | Engenharia excelente, problema errado |
| **three.js imperativo + `cannon-es`** | **~155 KB** | **Escolhida** |
| Babylon.js + Havok | ~674 KB + Babylon | Overkill; segundo engine 3D |
| Blender pré-renderizado em vídeo | dezenas de MB | Inviável |

### Por que `dice-box` foi eliminado
- **Não faz resultado predeterminado.** A issue #47 do repositório foi aberta pelo próprio
  mantenedor, que respondeu que exigiria trocar boa parte da aleatoriedade do núcleo.
  Continua aberta. Isso contradiz diretamente o [ADR-0006](0006-motor-de-regras.md).
- **Não usa three.js.** Depende de `@babylonjs/core@5.57.1` (quatro majors atrás do atual)
  com física Ammo — seria um **segundo engine 3D** no app.
- Cobre 7 dos 15 dados do catálogo, e inclui justamente o d12, que o sistema não usa.
- Último release em out/2024.

### Por que Rapier foi preterido
Rapier é o melhor motor de física WASM disponível e é ativamente desenvolvido. Mas
`@react-three/rapier@2.2.0` depende de `@dimforge/rapier3d-compat@0.19.2` — a linha que a
própria Dimforge documenta como **não** garantindo determinismo cross-platform. A garantia
existe apenas em `@dimforge/rapier3d-deterministic`, que é um build "less optimized", custa
~1.090 KB gz e exige a mesma versão exata em todos os clientes — inviável num PWA, onde
service workers antigos e novos coexistem por dias.

E, como a decisão seguinte mostra, **determinismo cross-platform não é necessário**.

## Decisão

### 1. Rotulagem pós-simulação, não semente nem snap

```
1. o motor de regras decide o resultado
2. a física roda HEADLESS, sem renderizar, gravando posição e rotação por frame
3. lê-se qual face de cada dado ficou para cima
4. ATRIBUI-SE a numeração das faces agora, de forma que a face de cima receba o
   valor decidido pelo motor e as demais recebam uma permutação válida do resto
5. reproduz-se a gravação já com a numeração correta desde o primeiro frame
```

Vantagens sobre as alternativas convencionais:

- **Sobre semente + busca por re-simulação:** a busca é rejeição. Para o d100 a chance de
  acertar o par é 1/100, ou seja ~100 simulações completas por rolagem — na rolagem mais
  frequente do sistema. Aqui o custo é **sempre uma** simulação.
- **Sobre snap/nudge final:** não existe correção. O dado nunca é girado depois de assentar.
  A física é livre e verdadeira; o que se ajusta é a numeração, antes de qualquer pixel ser
  desenhado.
- **Sobre trajetórias pré-computadas:** a trajetória é nova a cada rolagem.

**Corolário que reorganiza o projeto:** como o motor decide o número, **a geometria do dado
não precisa ser justa — só legível.** Isso dissolve a restrição do catálogo.

**Condição de implementação — dados em branco, revelação por fade.** Os dados rolam com as
faces **vazias** e a numeração só se materializa quando eles assentam, com uma animação de
fade-in.

Isso torna a rotulagem pós-simulação **completamente invisível**: não há troca a perceber,
porque nunca houve número em cena para trocar. É a solução mais forte que a alternativa
originalmente considerada (entrar em cena já em movimento), e tem três ganhos somados:

- elimina por construção qualquer risco de o jogador notar a atribuição de faces;
- vira o momento dramático da rolagem — o resultado **surge**, em vez de já estar lá;
- combina com o universo do sistema, onde a landing page trata os conteúdos como
  *"um sinal interceptado"*.

Detalhamento visual em [08 — Rolagem 3D](../08-rolagem-3d.md) §3.

### 2. Catálogo reduzido a cinco sólidos

Tetraedro, cubo, octaedro, trapezoedro pentagonal (d10) e icosaedro. Ver
[08 — Rolagem 3D](../08-rolagem-3d.md) §2.

### 3. Um único contexto WebGL, renderização sob demanda

O mesmo `WebGLRenderer` serve o `ColorBends` e o tray de dados. Nada é desenhado fora dos
~1,2 s da rolagem. Numa sessão de 4 h com 100 rolagens, são ~2 minutos de GPU em vez de 4 h.

### 4. `packages/dice-3d` atrás de uma interface mínima

`roll(dados: Die[], resultados: number[]): Promise<void>`. three.js e cannon-es não vazam
para o resto do app — o que torna barato trocar de motor de física se a prova de conceito
reprovar.

## Consequências

- **Delta de bundle de ~155 KB gz**, contra ~890 KB do Rapier e ~1.145 KB do dice-box. O
  three.js é custo afundado, já pago pelo `ColorBends`.
- **Custo de construção: 2 a 3 semanas** montando geometrias, materiais, iluminação, tray,
  curva de assentamento e som — contra "uma tarde" de uma biblioteca pronta. É o preço real
  de respeitar o ADR-0006.
- **Dependência estagnada.** `cannon-es@0.20.0` foi publicada em 2022 e o repositório teve o
  último commit em jan/2024, com bugs documentados de colisão entre convexos — exatamente o
  par de formas que dados usam. Mitigação: são ~120 KB de TypeScript MIT sem dependências,
  vendorizáveis, ao contrário de um binário WASM compilado de Rust. Além disso, como a
  simulação é gravada antes de ser renderizada, **simulações degeneradas podem ser
  descartadas e re-rodadas antes do primeiro frame** — o jogador nunca vê a falha.
- **Sem sincronia frame-a-frame entre jogadores.** Cada aparelho roda a própria simulação; o
  número é sempre o mesmo, porque vem do banco, mas os quiques diferem. Sincronizar custaria
  ~1.090 KB gz e pinagem eterna de versão, para entregar que duas pessoas vejam o mesmo
  tumble. Não vale.
- **Sem física interativa.** Não dá para arrastar dados pela mesa nem empilhá-los. Se isso
  entrar no roadmap, a decisão precisa ser revista.

## Condições de reversão

Esta ADR deve ser revista se:

1. **O `ColorBends` sair do app.** O three.js deixa de ser custo afundado e Babylon + Havok
   passa a ser tecnicamente mais forte.
2. **A prova de conceito reprovar** (ver [08](../08-rolagem-3d.md) §4). Planos B, nesta ordem:
   trajetórias assadas em build time; three.js imperativo + Rapier direto, sem R3F.
3. **A mesa exigir física de tabuleiro compartilhada** — dados que permanecem na mesa e podem
   ser empurrados, com estado sincronizado. Aí determinismo vira requisito e a resposta é
   Rapier na variante `-deterministic`.
