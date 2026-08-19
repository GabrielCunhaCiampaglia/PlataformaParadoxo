# 06 — Perguntas para o Cliente

Lista consolidada. Cada pergunta tem um selo de prioridade:

- 🔴 **BLOQUEANTE** — sem a resposta, não dá para especificar nem começar a frente correspondente.
- 🟠 **IMPORTANTE** — dá para começar com uma premissa, mas mudar depois custa retrabalho.
- 🟡 **PODE ESPERAR** — não trava nada agora.

> Sugestão de condução: as 🔴 cabem em **uma conversa de uma hora** com o cliente. Não são
> perguntas de detalhe — são o sistema dele. Vale gravar a conversa.

---

## ✅ Já respondidas — 19/08/2026

| # | Resposta |
|---|---|
| **R1** | **Usar `<=`.** Rolar exatamente o valor da Perícia é **sucesso**. Confirma que o protótipo tinha um bug |
| **R2** | **Arredondar para cima.** O limiar de Sucesso Bom é `teto(Perícia / 2)` |
| **R8 / R9** | **A tela de rolagem é livre.** Pode-se rolar sem Perícia; vincular uma Perícia é opcional e só então o resultado é interpretado |
| **D1** | **A fonte Helvetica Now Display pode ser usada.** A tipografia do protótipo fica preservada |
| **F1–F6** | ⏸️ **Ficha em aberto por decisão do cliente.** Ele enviará a definição depois; o template v1 fica vazio |

Regra oficial resultante em [02 — Regras do Sistema §1.2](02-regras-do-sistema.md).

---

## A. Regras de rolagem

| # | 🔴🟠🟡 | Pergunta |
|---|---|---|
| ~~R1~~ | ✅ | ~~`<` ou `<=`?~~ **Respondida: `<=`** |
| ~~R2~~ | ✅ | ~~Arredondamento de `Perícia / 2`?~~ **Respondida: para cima** |
| R3 | 🟠 | A rolagem `1` (Extremo) e a `100` (Desastre) ignoram completamente a Perícia. Um personagem com Perícia 100 ainda sofre Desastre no `100`. Correto? |
| R4 | 🔴 | Existe **Falha Crítica** além do `100` fixo? Uma faixa (ex.: 96–100)? |
| R5 | 🔴 | Existe algum grau de sucesso além de Bom e Normal? (Ex.: `Perícia / 5` como sucesso extremo.) |
| R6 | 🔴 | **Existem modificadores?** Bônus e penalidades, níveis de dificuldade, vantagem/desvantagem, rolar duas vezes? *Não há nada disso no rolador, e é o tipo de regra que costuma existir só na mesa.* |
| R7 | 🔴 | Existe **teste oposto** — jogador contra jogador, ou jogador contra um Kiev? Como se resolve? |
| ~~R8~~ | ✅ | ~~Rolar sem Perícia informada?~~ **Respondida: rolagem livre, sem interpretação** |
| ~~R9~~ | ✅ | ~~Pode rolar d100 solto?~~ **Respondida: sim** |

## B. Dano e combate

| # | 🔴🟠🟡 | Pergunta |
|---|---|---|
| C1 | 🟠 | **O D12 não está na lista de dados** (tem D2, D3, D4, D6, D8, D10, depois pula para D20). Intencional ou esquecimento? |
| C2 | 🔴 | Existe **modificador fixo de dano** (`2d6+3`)? Vem da arma, de um atributo do personagem, ou é digitado na hora? |
| C3 | 🔴 | Um **Extremo!** ou **Sucesso Bom** na rolagem de Ação afeta o dano? Dobra, maximiza, rola dados extras? |
| C4 | 🟠 | Existem **tipos de dano** (perfurante, corte, impacto, psíquico…)? Resistência/armadura reduz por tipo? |
| C5 | 🟠 | Uma rolagem de dano precisa **misturar dados diferentes** (`1d6 + 1d4`)? |
| C6 | 🟠 | Existe **cura**? Usa a mesma mecânica de dano? |
| C7 | 🟠 | Como funciona **iniciativa / ordem de turno**? Existe? |
| C8 | 🟡 | Existe **armadura** e como ela entra na conta? |

## C. Ficha de personagem ⏸️ *aguardando o cliente*

**Em aberto por decisão do cliente (19/08/2026).** Ele enviará a definição da ficha depois.
Até lá, `sheet_template` v1 fica **vazio** e nada é presumido por analogia.

Isso **não trava a frente de Dados**, que só precisa de um número entre 1 e 100 — digitável
enquanto a ficha não existe, exatamente como o rolador atual já faz.

As perguntas abaixo permanecem como roteiro para quando ele for definir o formato:

| # | 🔴🟠🟡 | Pergunta |
|---|---|---|
| F1 | ⏸️ | **Você tem a ficha em papel, PDF, planilha ou anotação?** Se sim, ela responde metade desta seção sozinha — é o item mais valioso que podemos receber. |
| F2 | ⏸️ | Quais são as **Perícias** do sistema? Lista fechada, ou o jogador cria as dele? |
| F3 | ⏸️ | Qual a **faixa de valores** de uma Perícia? 0–100? Existe teto? |
| F4 | ⏸️ | Existe uma camada de **Atributos** (Força, Agilidade, Intelecto…) acima das Perícias? Os atributos **derivam** o valor das perícias por fórmula, ou são independentes? |
| F5 | ⏸️ | Quais **recursos** o personagem tem? Vida/Saúde é certo. Existe Sanidade, Estresse, Energia, Fome? Como se recuperam? |
| F6 | ⏸️ | O que mais aparece na ficha? Nome, idade, ocupação, aparência, história, contatos, condições/status? |
| F7 | 🟠 | Existe **progressão**? XP, evolução de perícia por uso, níveis? |
| F8 | 🟠 | O **"Ranking de combate"** citado na lore é mecânica de personagem ou só ambientação? Se é mecânica, como funciona? |
| F9 | 🟠 | A **Organização Resiliência** (ou outras facções) tem efeito na ficha? |
| F10 | 🟠 | Existem **condições/estados** (ferido, envenenado, em pânico) que alterem rolagens? |
| F11 | 🟡 | Existe criação de personagem com regras (pontos para distribuir, sorteio)? Ou o jogador só preenche? |

## D. Inventário 🔴

Também não há nada nos protótipos.

| # | 🔴🟠🟡 | Pergunta |
|---|---|---|
| I1 | 🔴 | O inventário tem **limite**? Por peso, por slots, por nada? |
| I2 | 🔴 | Estar sobrecarregado **penaliza** alguma rolagem? |
| I3 | 🔴 | Que **propriedades** um item tem? Nome, descrição, quantidade — e o quê mais? Peso, valor, raridade, dano, durabilidade, munição? |
| I4 | 🔴 | Existe **equipar**? Quantos itens dá para equipar ao mesmo tempo? Existem slots (mão, corpo, mochila)? |
| I5 | 🟠 | Item equipado **altera a ficha** (bônus de perícia, armadura)? |
| I6 | 🟠 | Existem **consumíveis** que gastam quantidade ao usar? E munição? |
| I7 | 🟠 | Existe **durabilidade / quebra** de item? |
| I8 | 🟠 | Existe um **catálogo de itens** pré-definido pelo sistema, ou o jogador digita tudo? *Catálogo é bem mais trabalhoso — precisa de painel de administração.* |
| I9 | 🟡 | Existe dinheiro / economia / troca entre personagens? |

## E. Mesa, mestre e permissões

| # | 🔴🟠🟡 | Pergunta |
|---|---|---|
| M1 | 🟠 | Um jogador pode ter **mais de um personagem** na mesma mesa? |
| M2 | 🟠 | O personagem é **preso à mesa** ou o jogador leva o mesmo personagem para outras mesas? |
| M3 | 🟡 | Uma mesa pode ter **mais de um Mestre**? |
| M4 | 🔴 | O Mestre pode **editar** a ficha do jogador, ou só visualizar? |
| M5 | 🟠 | **Ficha de NPC e de Kiev** entra no v1, ou fica para depois? *Nossa proposta é v1.1.* |
| M6 | 🟠 | O Mestre precisa de **rolagem oculta**? *Assumimos que sim.* |
| M7 | 🟡 | Qual o tamanho típico de uma mesa? Quantas mesas simultâneas esperamos? |
| H1 | 🟠 | No site você escreve que o histórico mostra a **"origem"** da rolagem. Entendemos como *o que disparou a rolagem* — a Perícia "Furtividade", o item "Faca de Combate". É isso? |

## F. Técnicas e produto

| # | 🔴🟠🟡 | Pergunta |
|---|---|---|
| A1 | 🟠 | A rolagem precisa ser **à prova de trapaça** (calculada no servidor)? Ou a confiança da mesa basta, como num dado físico? |
| A2 | 🟡 | Se duas pessoas editarem a mesma ficha ao mesmo tempo, o último a salvar vence — está bom? |
| A3 | 🟠 | **Quem administra as regras e o formato da ficha?** Você quer um painel para editar isso sozinho, ou prefere nos pedir e a gente publica a versão nova? |
| P1 | 🟠 | O site anuncia "Download • Windows" e "Download • Android" com número de versão. Nossa proposta é **PWA instalável** — instala nos dois sem loja de aplicativos. Precisa mesmo de um `.exe` e de presença na Play Store? |
| P2 | 🟡 | A plataforma é gratuita? Existe plano pago no horizonte? *Isso muda a modelagem de contas.* |
| P3 | 🟡 | O app precisa funcionar **offline** numa sessão presencial sem internet? *Assumimos que sim e já projetamos para isso.* |

## G. Design e ativos

| # | 🔴🟠🟡 | Pergunta |
|---|---|---|
| ~~D1~~ | ✅ | ~~A licença da Helvetica Now Display cobre webfont?~~ **Respondida: sim, pode usar.** A tipografia do protótipo fica preservada |
| D2 | 🟠 | A animação de **2 segundos** antes de revelar a rolagem pode ser reduzida para menos de 1 s, com opção de pular? *Numa mesa com muitas rolagens, 2 s vira espera.* |
| D3 | 🟠 | Existe **manual de marca**, paleta oficial ou versões vetoriais do logo? Só temos os PNGs do repositório. |
| D4 | 🟡 | O repositório `ParadoxoEpifanicoD` é idêntico ao `ParadoxoEpifanico`. Pode ser **arquivado**? |
| D5 | 🟡 | Existe referência visual de ficha que você goste (de outro RPG, de outra plataforma)? |

## H. Rolagem 3D

Decisões já fechadas com você: os dados rolam **em 3D com física real**, com as **faces em
branco**, e o número se revela por **fade** ao assentarem. O **d100 é dois d10** (dezenas e
unidades). O catálogo de 15 dados foi reduzido a 5 sólidos — ver
[08 — Rolagem 3D](08-rolagem-3d.md).

| # | 🔴🟠🟡 | Pergunta |
|---|---|---|
| T1 | 🟠 | As faces que **não** ficaram para cima aparecem numeradas em baixo contraste, ou permanecem vazias? *Vazias é mais elegante, mais barato e reforça o tema.* |
| T2 | 🟠 | O jogador pode **girar a câmera** para ver os dados de outro ângulo, ou o ângulo é fixo? *Define T1 e o volume de arte.* |
| T3 | 🟠 | O tray de rolagem ocupa a tela toda, ou é uma bandeja delimitada num canto, com a ficha visível ao lado? |
| T4 | 🟡 | A rolagem tem **som**? Precisa entrar no orçamento de assets offline. |
| T5 | 🟡 | Um **Extremo!** ou **Desastre!** merece uma revelação diferenciada — o efeito glitch que já existe no seu CSS? |

---

## Resumo — o que é indispensável para destravar

| Frente | Depende de | Situação |
|---|---|---|
| **Dados** | ~~R1, R2, R8, R9~~ · R4, R5, R6, R7, C2, C3 | **Parcialmente destravada** — a tabela de resultados está fechada |
| **Ficha** | F1–F6 | ⏸️ Aguardando o cliente enviar a definição |
| **Inventário** | I1, I2, I3, I4 | Travada |
| **Design** | ~~D1~~ | ✅ **Destravada** |

**O que mudou em 19/08/2026:** o design saiu do caminho crítico (fonte liberada) e a
mecânica central da rolagem está fechada. O gargalo agora é **R4–R7** — Falha Crítica, grau
extra de sucesso, modificadores e teste oposto. São as quatro que faltam para a frente de
Dados ficar completa, e todas são perguntas sobre regras que existem na mesa, não no código.
