# ADR-0012 — A mesa 3D: estética PS1, câmeras fixas, e o texto fora do 3D

**Data:** 2026-08-27 · **Status:** Aceita — cena em `/mesa`, com a rolagem ligada. Revisada no mesmo dia após retorno do cliente (§6).

## Contexto

O cliente pediu uma mesa 3D com visão em primeira pessoa, na qual o jogador clica em
objetos para trazê-los para perto: a ficha, a área de dados. Depois definiu a direção de
arte — **3D antigo, textura de baixa resolução, analog horror** — e o enquadramento: mesa
de madeira, uma lâmpada amarela pendurada que mal aparece, e nada mais.

Contra isso pesavam três objeções, levantadas antes de qualquer código:

1. **Celular.** A decisão que sustenta a rolagem é renderizar SOB DEMANDA
   ([doc 08 §5](../08-poc-rolagem-3d.md)): numa sessão de 4 h com 100 rolagens são ~2 min de
   GPU, não 4 h. Uma cena persistente em primeira pessoa joga isso fora.
2. **Assets.** Madeira, cumbuca e papel em PBR são alguns MB, e o bundle já está em 226 KB
   comprimidos contra um orçamento de ~155 KB.
3. **Texto.** A ficha é um formulário denso. Ler e editar texto dentro de espaço 3D é ruim —
   e a briga para deixar um número de dois dígitos legível numa face de d10 inclinada custou
   um dia inteiro.

## Decisão

### 1. A estética retrô é a solução de performance, não um custo dela

> ⚠️ Esta seção falava em PS1. A referência do cliente é N64 — ver §6.1.

Cada traço da direção de arte remove exatamente um dos itens caros:

| pipeline moderno | aqui |
|---|---|
| PBR por fragmento | Lambert, uma luz |
| shadow map 1024² todo quadro | mancha pintada sob o objeto |
| texturas de MB | 256 px desenhados em canvas |
| renderiza a 1,75× o dpr | renderiza a 640 no lado maior |

A última linha decide. Medido em tela de 1280×720: **230.400 pixels internos contra 921.600
nativos, 4× menos trabalho de fragmento** — e num celular de dpr 3 a diferença é maior ainda.

O serrilhado que sobra não é defeito a esconder: é o efeito pedido.

### 2. Texturas procedurais, não arquivos

Desenhadas em canvas a 256 px. Nesse tamanho o ruído procedural é indistinguível de uma foto
reduzida, porque quase toda a informação da foto se perde na redução. Zero byte de asset,
nada para carregar pela rede, e a paleta sai de código acompanhando o design system.

### 3. Câmeras fixas, não primeira pessoa livre

Três motivos, e o terceiro é o decisivo:

1. navegar em primeira pessoa no toque é desconfortável;
2. enquadramento fixo é a linguagem do survival horror da época — a restrição vira estilo;
3. **a cena só desenha enquanto a câmera se move.** Parada, o último quadro serve.
   ⚠️ Revisto em §6.5: a oscilação da lâmpada tornou o laço contínuo.

### 4. O texto NUNCA é 3D

O papel na mesa é um quad com textura baixa, ilegível de propósito — o jogador reconhece
"é uma ficha preenchida" pelo ritmo dos blocos sem ler nada, que é o estado certo antes de
aproximar. Quando a câmera chega, a ficha em **HTML** entra por cima e a cena 3D **para de
desenhar**.

Isso resolve os dois lados de uma vez. Ler a ficha — que é onde o jogador passa a maior
parte do tempo — custa **zero GPU**. E a ficha é DOM de verdade: teclado do celular,
rolagem, seleção de texto e acessibilidade funcionam porque nunca deixaram de ser DOM.

### 5. O tapete de dados existe por física, não por decoração

A simulação sempre teve paredes invisíveis para os dados não escaparem
([ADR-0010](0010-rolagem-3d.md)). Numa mesa de madeira lisa isso seria mágica visível. O
tapete com friso dá de onde a parede sair — e é o que existe numa mesa de RPG real.

## Consequências

**Boas**

- A restrição de celular deixou de ser conflito com a direção de arte e virou aliada dela.
- Nenhum asset externo: a cena aparece pronta no primeiro quadro.
- A ficha 2D continua obrigatória e inalterada — o 3D é casca, nada do trabalho dela é
  perdido nem duplicado.
- O enquadramento virou requisito testável. `test/enquadramento.test.ts` afirma que a lâmpada
  fica no terço superior do quadro e que a mesa passa por fora dele, nas duas disposições e em
  seis proporções de tela — de 9:19,5 a 21:9. Os dois defeitos que esse teste achou de primeira (preto
  nas laterais, borda da frente à mostra) teriam passado por uma conferência a olho.

**Ruins, ou a acompanhar**

- ~~A rolagem ainda não está ligada à cena.~~ Ligada em 27/08 — ver §6.3.
- Com uma luz só, o lado do dado oposto à lâmpada fica preto. Aceitável para dado em repouso,
  provavelmente não para dado sendo lido.
- O laço de animação **não pôde ser exercitado na verificação**: a prévia roda com
  `document.hidden` sempre verdadeiro e `requestAnimationFrame` não dispara. As capturas são
  de quadros forçados; a transição de câmera e a oscilação da lâmpada foram conferidas por
  leitura de código, não em movimento.
- Escopo: esta é uma quarta frente, além de dados, ficha e inventário
  ([ADR-0001](0001-escopo-v1.md)). A ordem recomendada continua sendo **ficha 2D primeiro** —
  a mesa precisa saber o que vai ter em cima dela.

## Alternativas descartadas

- **Primeira pessoa com navegação livre.** Desconfortável no toque, e obriga a cena a
  desenhar continuamente. Câmeras fixas dão o mesmo acesso aos objetos por muito menos.
- **PBR com assets comprados.** Custa MB de bundle, exige orçamento de arte, e brigaria com a
  direção de analog horror em vez de servi-la.
- **Renderizar a ficha em 3D, com o texto na textura.** Precisaria de atlas gigante para o
  texto ficar legível, perderia teclado e acessibilidade, e ainda assim seria pior de ler.
- **Cumbuca de dados.** Foi a proposta inicial; o cliente preferiu jogar os dados na mesa,
  por ser mais imersivo. O tapete substitui a cumbuca no papel de conter os dados.

---

## 6. Revisão de 27/08/2026, após a primeira olhada do cliente

Cinco retornos, e três deles derrubaram premissas desta ADR. Ficam registrados porque a
versão original delas está acima e seria enganoso deixá-la de pé.

### 6.1 A referência é N64, não PS1 — "achei pixelado demais"

O cliente mandou capturas do que tinha em mente. Elas são de 640×480, com textura
**bilinear** e bastante detalhe; o serrilhado vem da geometria, não da superfície. O que
mudou:

| | antes | agora |
|---|---|---|
| alvo interno | 240 de ALTURA | 640 no LADO MAIOR |
| filtro de textura | NEAREST, sem mipmap | bilinear, com mipmap |
| textura | 128 px | 256 px, ficha em 512 |
| quantização de cor | 32 níveis (15 bits, PS1) | 64 níveis |
| jitter de vértice | grade 160 | grade 320 (mais fino) |

Fixar a ALTURA tinha um segundo defeito além do visual: num celular em pé, 240 de altura
dá 110 de largura. Limitando o lado maior, o orçamento de pixels é o mesmo deitado ou em pé.

### 6.2 O celular cortava ficha e tapete — e o teste não pegava

O teste de enquadramento original só rodava em telas largas, então o corte no celular
passou. Duas coisas mudaram:

- **A mesa se reorganiza.** Em tela larga, ficha e tapete ficam lado a lado; num celular em
  pé, um atrás do outro. Não havia alternativa: com 9:19,5 e 45° de campo vertical, o campo
  horizontal dá menos de meio metro de mundo. Afastar a câmera até caber deixaria a mesa
  minúscula; abrir o campo até caber exigiria 90°.
- **O `fov` deixou de ser um número fixo.** `resolveView` calcula o mínimo que faz os cantos
  do alvo caberem, medindo em espaço de câmera e sobre os cantos de verdade. A primeira
  tentativa media a largura na distância do ALVO e continuava cortando: o tapete fica mais
  perto da câmera do que o ponto para onde ela olha, e se espalha mais em ângulo.

O teste agora roda tudo nas duas disposições e em seis proporções, de 9:19,5 a 21:9.

### 6.3 A rolagem está ligada à cena

Não é um segundo renderer: física, rotulagem pós-simulação e shader de numeração são os
mesmos do módulo em tela cheia. Para isso o material saiu de `renderer.ts` para
`dice-3d/src/material.ts`, e a mesa o aplica sobre um `MeshLambert` com o shader de época.

Três defeitos apareceram nessa costura, e nenhum deles levantava erro:

1. **Os dados saíam sem número.** `onBeforeCompile` é um campo, não uma lista: `applyPS1`
   atribuía por cima de `applyDiceNumbering` e apagava o shader dos números. Os dois passaram
   a encadear.
2. **Dados sumiam da cena, em NaN.** A alocação preguiçosa do buffer de gravação só crescia
   na cutucada; uma rolagem que passasse de 300 passos por conta própria escrevia fora do
   `Float32Array` em silêncio. A gravação anunciava 312 passos com dados para 300, e ler o
   último devolvia `undefined`. **Este defeito existia também no módulo em tela cheia.**
   Coberto agora por teste de regressão.
3. **O resultado aparecia antes do dado revelar**, matando o suspense. `roll()` resolvia ao
   fim da SIMULAÇÃO, não da animação. Agora espera `whenSettled()` — com watchdog de relógio,
   porque `rAF` não dispara em aba de fundo e a interface travaria em "Rolando…".

### 6.4 Tamanho e duração

- **"Quase do tamanho de um punho fechado".** A escala vinha só do tray. Agora há teto de
  raio: ele manda com um ou dois dados, e com muitos volta a mandar o tray, que os encolhe
  para caber.
- **"Demora para parar".** Medido em 80 rolagens por formato: mediana de 2,6 s (1d20) a
  4,9 s (6d6), cauda até 9,2 s. A REPRODUÇÃO passou a rodar a 1,9×, o que encurta sem tocar
  na simulação — resultado e validação de legibilidade continuam idênticos.

### 6.5 O laço passou a rodar contínuo, e isto contradiz a §3

A promessa era desenhar só durante o movimento da câmera. A oscilação da lâmpada quebrou
essa promessa: mesa parada lê como foto, e a cena inteira vive de parecer um lugar. O que
sustenta a troca é o custo medido e o fato de o laço PARAR nos dois lugares onde o jogador
de fato fica — com a ficha aberta e com a aba em segundo plano.
