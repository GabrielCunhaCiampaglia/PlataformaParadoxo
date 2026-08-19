# 08 — Rolagem 3D

Especificação da rolagem de dados tridimensional. Decisão de tecnologia e justificativa em
[ADR-0010](adr/0010-rolagem-3d.md).

> **Requisito do cliente:** a rolagem precisa ser bonita, premium, com boa visualização e
> utilização, e os dados precisam **realmente rolar** em 3D.

---

## 1. Como o resultado chega na tela

O [ADR-0006](adr/0006-motor-de-regras.md) determina que o número vem do motor de regras, não
da física. A conciliação é feita por **rotulagem pós-simulação**:

```
1. packages/rules decide o resultado          d100 → 47  (dezenas 40, unidades 7)
2. packages/dice-3d roda a física HEADLESS, sem desenhar nada,
   gravando posição e quaternion de cada dado por frame        ~90–120 passos
3. lê-se qual índice de face ficou para cima em cada dado
4. ATRIBUI-SE a numeração: a face de cima do dado de dezenas recebe "40",
   a do dado de unidades recebe "7", e as demais recebem uma permutação
   válida dos rótulos restantes
5. reproduz-se a gravação com o renderer
6. ao assentar, os números fazem FADE-IN nas faces
```

A física é livre e verdadeira. **Não há snap, não há correção de rotação, não há busca por
semente.** O que se ajusta é a numeração — e ela é aplicada antes do primeiro pixel.

### 1.1 Por que isso é invisível

Porque **os dados rolam sem números**. Ver §3. Não existe numeração em cena antes do
assentamento, logo não existe troca a ser percebida.

### 1.2 Validação antes de renderizar

Como a simulação é **gravada** antes de ser reproduzida, dá para inspecioná-la e descartá-la:
dado que saiu do tray, interpenetração acima de um limiar, ou que não assentou em 200 passos.
Nesse caso re-roda-se com novo arremesso. **O jogador nunca vê a falha**, porque ela acontece
antes do primeiro frame.

Essa é a principal mitigação dos bugs conhecidos de colisão convexo-convexo do `cannon-es`.

### 1.3 Consequência para o tempo real

Cada aparelho roda a própria simulação. O **número** é idêntico para todos, porque vem da
tabela `roll` no banco ([ADR-0009](adr/0009-tempo-real.md)); as **trajetórias** divergem.
Isso é aceito deliberadamente — sincronizar os quiques custaria ~1.090 KB gz e pinagem de
versão entre clientes de um PWA.

---

## 2. Catálogo: 15 dados, 5 sólidos

A geometria não precisa ser justa, apenas **legível**. Isso reduz o catálogo do sistema a
cinco malhas.

| Dado do sistema | Representação | Nota |
|---|---|---|
| **D2** | d6 rotulado `1,2,1,2,1,2` | Prática de mesa real |
| **D3** | d6 rotulado `1,2,3,1,2,3` | Prática de mesa real |
| **D4** | tetraedro, **leitura pela face superior** | Evita o problema clássico de ler o d4 pela aresta |
| **D6** | cubo | |
| **D8** | octaedro | |
| **D10** | trapezoedro pentagonal | |
| **D20** | icosaedro | |
| **D30, D40, D50, D60, D70, D80, D90** | **par de d10**: dezenas + unidades, com o dado das dezenas rotulado apenas com os dígitos válidos daquele dado, repetidos | Quem olha vê no máximo 3 faces por vez; a repetição não é perceptível |
| **D100** | **par de d10 percentual** — `00–90` + `0–9` | **Confirmado com o cliente.** Ver §2.1 |

**Malhas necessárias:** tetraedro, cubo, octaedro, trapezoedro pentagonal, icosaedro.

### 2.1 O d100 é dois d10

Decisão confirmada. É a prática física universal, é o que para mais rápido e o que fica mais
legível em tela de celular — e o d100 é a rolagem **mais frequente** do sistema (é a Rolagem
de Ação contra Perícia).

O Zocchihedron foi **descartado**: rola demais, demora a parar, é ilegível de longe e não é
justo. Justamente onde não se pode gastar três segundos.

**Ganho arquitetural:** a rolagem mais comum do sistema custa **dois corpos rígidos** — o
cenário mais barato possível. A performance deve ser otimizada para esse caso, não para o
`10d6` de dano.

### 2.2 Leitura do resultado

Dois dados separados exigem que o jogador componha o número mentalmente. Portanto o HUD
mostra a conta explícita:

```
40  +  7  =  47
```

É consistente com o que o [doc 02 §3.1](02-regras-do-sistema.md) já registra para o histórico
(`"4 + 2 + 6 = 12"`) e usa os tokens de resultado do
[design system §1.1](05-design-system.md).

---

## 3. A revelação — dados em branco e fade-in

**Os dados rolam com as faces vazias.** A numeração só se materializa quando assentam.

### 3.1 Sequência

| Fase | Duração aprox. | O que acontece |
|---|---|---|
| **Arremesso** | 0–200 ms | Os dados entram em cena. Faces limpas, sem numeração |
| **Rolagem** | ~1,2 s | Física real: colidem entre si e com as paredes do tray |
| **Assentamento** | — | Os dados param. Faces ainda vazias, por um beat curto |
| **Revelação** | ~400–600 ms | O número faz **fade-in** na face superior |
| **Leitura** | — | HUD compõe o total e aplica o token de resultado |

O **beat de silêncio** entre o assentamento e a revelação é o que dá peso dramático. Sem ele
o fade lê como atraso de carregamento; com ele lê como revelação.

### 3.2 Direção visual do fade

Alinhada ao [design system](05-design-system.md) e ao universo do sistema — a landing page do
cliente trata os conteúdos como *"um sinal interceptado"*, o que sugere o número **se
sintonizando** em vez de simplesmente aparecer:

- opacidade de 0 a 1, com leve escala partindo de ~0,9
- brilho violeta (`--violet: #8d10e0`) no pico, decaindo para o repouso
- para **Extremo!** e **Desastre!**, a revelação escala: o efeito `.glitch` já existente no
  CSS do protótipo é o candidato natural, e é exatamente o uso pontual que o
  [design system §4](05-design-system.md) reserva para ele

**Demais faces.** Duas opções a resolver na fase de arte:
1. permanecem vazias — mais barato, mais elegante, reforça o tema;
2. recebem numeração de baixo contraste, também por fade — mais crível se houver câmera livre.

Sem câmera livre, a opção 1 é suficiente e é a recomendação.

### 3.3 Acessibilidade e ritmo

- `prefers-reduced-motion` pula a física e vai direto ao resultado revelado.
- Preferência de **rolagem rápida** para quem já viu a animação mil vezes
  (ver pergunta D2 em [06](06-perguntas-para-o-cliente.md)).
- Tocar na tela durante a rolagem **pula para o resultado** — numa mesa com dezenas de
  rolagens por sessão, poder pular é requisito, não conveniência.
- O resultado sempre aparece também como **texto** no HUD, nunca só como face 3D.

---

## 4. Prova de conceito — 3 dias

A decisão está **condicionada** a esta validação. O risco todo está concentrado numa hipótese.

> **H1 — `cannon-es` leva de 2 a 10 poliedros convexos ao repouso, headless, de forma
> confiável, para as cinco geometrias, em menos de ~30 ms de CPU num Android intermediário —
> sem interpenetração, sem dado que nunca assenta e sem exceção de face indefinida.**

É arriscada porque as issues do `pmndrs/cannon-es` documentam exatamente esse par de formas
falhando, numa biblioteca cujo último commit é de jan/2024.

### Dia 1 — harness headless em Node, zero pixels

- Gerar as 5 geometrias por código e derivar os `ConvexPolyhedron`.
  **Validar não-coplanaridade de faces na geração** — é requisito estrutural da biblioteca e
  é onde o d10 costuma quebrar.
- Rodar **50.000 simulações**: `2× d10` (o caso do d100, ~70% da amostra), `1× d20`,
  `3× d6`, `10× d6`.
- Coletar por rodada: passos até repouso, interpenetração acima de ε, dado fora do tray, dado
  que não assentou em 200 passos, exceção lançada, ms de CPU, face resultante.

**Critério de morte:** mais de **2%** de rodadas degeneradas *depois* de tunar
`solver.iterations`, `allowSleep`, `sleepSpeedLimit`, restituição e atrito. Abaixo disso, o
filtro de §1.2 absorve o problema de forma invisível.

### Dia 2 — distribuição de faces e teste de rotulagem

- Verificar a distribuição das **faces de repouso**. Não precisa ser uniforme — o motor decide
  o número — mas **precisa cobrir todas as faces**. Se o d20 nunca assenta em certas faces, a
  rotulagem fica previsível para quem joga quatro horas.
- Implementar a rotulagem e rodar o **teste de fogo**: 100 rolagens de d100 forçadas a `1`,
  `50` e `100`, verificando que a leitura visual bate com o valor do motor em **100 de 100**.
  Zero tolerância — é a restrição do [ADR-0006](adr/0006-motor-de-regras.md).

### Dia 3 — aparelho real

Página estática, sem React, renderer mínimo, **rodando num Android intermediário de verdade**
— não em emulador nem com throttling do DevTools, que simula CPU mas não simula GPU nem
comportamento térmico.

| Métrica | Aprova | Reprova |
|---|---|---|
| Rodadas degeneradas | < 2% | ≥ 2% |
| Simulação headless de `2× d10`, p95 | < 30 ms | > 60 ms |
| Simulação headless de `10× d6`, p95 | < 120 ms | > 250 ms |
| fps na reprodução, com `ColorBends` no mesmo contexto | ≥ 55 | < 45 |
| Leitura visual = valor do motor | 100% | qualquer falha |
| Faces do d20 nunca alcançadas | 0 | ≥ 1 |
| Δ temperatura da bateria em 60 min | ≤ +4 °C | ≥ +7 °C |

**O PoC não testa estética de propósito.** Materiais, iluminação, sombra e som são trabalho
previsível de design, não risco. Fazer um d20 lindo primeiro e descobrir no mês 3 que ele não
assenta é o erro clássico.

### Se reprovar

Nesta ordem:

1. **Trajetórias assadas em build time** — o mesmo `cannon-es` rodando em Node no CI, onde
   instabilidade é filtrável e latência não custa nada, gravando quaternions. ~15 KB gz por
   conjunto de variações, zero física em runtime, animação idêntica em todo aparelho. Perde-se
   a reação a gesto.
2. **three.js imperativo + Rapier direto, sem R3F** — física ativamente mantida, ao custo de
   ~590 KB gz.

Como `packages/dice-3d` expõe apenas `roll(dados, resultados)`, qualquer uma das trocas fica
confinada ao pacote.

---

## 5. Orçamento de bundle (gzip)

| Módulo | Orçamento | Real |
|---|---|---|
| three.js tree-shaken — **já pago** pelo `ColorBends` | ≤ 140 KB | build completo = 182,7 KB |
| `cannon-es` | — | **34,3 KB** |
| Geometrias + atlas de faces (KTX2/WebP) | ≤ 120 KB | — |
| **Delta do módulo de dados** | **≤ 160 KB** | **~155 KB** |

Comparativo do mesmo delta nas alternativas: R3F + Rapier ≈ 890 KB; Rapier determinístico
≈ 1.142 KB; Babylon + Havok ≈ 674 KB mais o Babylon; `dice-box` ≈ 1.145 KB mais assets;
vídeo pré-renderizado, dezenas de MB.

---

## 6. Pendências

| # | Questão |
|---|---|
| T1 | As faces não-superiores ficam vazias ou recebem numeração de baixo contraste? (§3.2) |
| T2 | Existe câmera livre, ou o ângulo é fixo? Define T1 e o custo de arte |
| T3 | O tray é a mesa toda, ou uma bandeja delimitada no canto da tela? |
| T4 | A rolagem tem som? Precisa de assets de áudio no orçamento do service worker |
| D2 | *(já em [06](06-perguntas-para-o-cliente.md))* Duração total aceitável da animação |
