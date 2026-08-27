# ADR-0012 — A mesa 3D: estética PS1, câmeras fixas, e o texto fora do 3D

**Data:** 2026-08-27 · **Status:** Aceita — cena inicial entregue em `/mesa`

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

### 1. A estética PS1 é a solução de performance, não um custo dela

Cada traço da direção de arte remove exatamente um dos itens caros:

| pipeline moderno | aqui |
|---|---|
| PBR por fragmento | Lambert, uma luz |
| shadow map 1024² todo quadro | mancha pintada sob o objeto |
| texturas de MB | 128 px desenhados em canvas |
| renderiza a 1,75× o dpr | renderiza a 320×240 e amplia |

A última linha decide. Medido em tela de 1280×720: **102.480 pixels internos contra 921.600
nativos, 9× menos trabalho de fragmento** — e num celular de dpr 3 a diferença é maior
ainda. Custo de CPU medido: **0,145 ms por quadro**.

O serrilhado que sobra não é defeito a esconder: é o efeito pedido.

### 2. Texturas procedurais, não arquivos

Desenhadas em canvas a 128 px. A 128 px o ruído procedural é indistinguível de uma foto
reduzida, porque quase toda a informação da foto se perde na redução. Zero byte de asset,
nada para carregar pela rede, e a paleta sai de código acompanhando o design system.

### 3. Câmeras fixas, não primeira pessoa livre

Três motivos, e o terceiro é o decisivo:

1. navegar em primeira pessoa no toque é desconfortável;
2. enquadramento fixo é a linguagem do survival horror da época — a restrição vira estilo;
3. **a cena só desenha enquanto a câmera se move.** Parada, o último quadro serve.

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
  fica no quinto superior do quadro e que a mesa passa por fora dele, em cinco proporções de
  tela — de celular em pé a 21:9. Os dois defeitos que esse teste achou de primeira (preto
  nas laterais, borda da frente à mostra) teriam passado por uma conferência a olho.

**Ruins, ou a acompanhar**

- A rolagem ainda **não está ligada à cena**. Os dados sobre o tapete são estáticos. Ligar as
  duas é o próximo passo, e vai exigir reconciliar as duas iluminações — a rolagem clareia os
  dados para o número ser legível, a mesa os deixa meio na sombra.
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
