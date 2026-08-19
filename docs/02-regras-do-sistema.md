# 02 — Regras do Sistema Paradoxo Epifânico

> **Como ler este documento.** Cada regra está marcada com um de três selos:
>
> - 🟩 **FATO** — extraído diretamente do código do cliente. Comportamento verificado.
> - 🟨 **PREMISSA** — inferência nossa, coerente com o que existe, **a confirmar com o cliente**.
> - 🟥 **LACUNA** — não existe informação alguma. Bloqueia a especificação.
>
> Nenhuma regra 🟨 ou 🟥 deve virar código antes de confirmada.

Fonte única: `ParadoxoEpifanicoDados/index.html`, linhas 242–325.

---

## 1. Rolagem de Ação — d100 contra Perícia

### 1.1 Mecânica base — 🟩 FATO

Rola-se **1d100** (inteiro de 1 a 100, uniforme) e compara-se contra o valor de
**Perícia** do personagem. **Rolar baixo é bom** (sistema percentual, roll-under).

### 1.2 Tabela de resultados — ✅ CONFIRMADA PELO CLIENTE (19/08/2026)

O cliente confirmou as duas correções: a comparação passa a ser **`<=`** e o limiar de
Sucesso Bom **arredonda para cima**. Esta é a regra oficial:

| # | Condição | Resultado | Cor |
|---|---|---|---|
| 1 | `roll === 1` | **Extremo!** | Dourado |
| 2 | `roll === 100` | **Desastre!** | Vermelho |
| 3 | `roll <= teto(Perícia / 2)` | **Sucesso Bom** | Verde |
| 4 | `roll <= Perícia` | **Sucesso Normal** | Verde claro |
| 5 | qualquer outro caso | **Falha** | Vermelho |

As condições continuam sendo avaliadas **nesta ordem**, e a primeira que casar vence.

#### O que mudou em relação ao protótipo

| Regra | Protótipo (`ParadoxoEpifanicoDados`) | Oficial |
|---|---|---|
| Comparação | `<` — rolar igual à Perícia **falhava** | **`<=`** — rolar igual à Perícia é **sucesso** |
| Limiar de Sucesso Bom | `Perícia / 2` fracionário | **`teto(Perícia / 2)`** |

O rolador atual estava, portanto, **mais severo do que o sistema pretende**. Todo
personagem já jogado teve taxa de sucesso 1 ponto percentual menor que o devido, e as
perícias ímpares tiveram a faixa de Sucesso Bom encurtada.

#### Por que `<=` é evidentemente o correto

Com `<=`, a matemática fecha: uma Perícia de valor **P** passa a dar exatamente **P%** de
chance de sucesso (P−1 rolagens entre `2` e `P`, mais o `1` que é Extremo). A Perícia
**significa literalmente a sua porcentagem de sucesso** — que é a razão de existir de um
sistema percentual. Com `<` isso não fechava.

### 1.3 Consequências da regra — ✅ CONFIRMADAS

- **`1` e `100` são absolutos.** Independem da Perícia. Um personagem com Perícia 100 ainda
  sofre Desastre no `100`; um com Perícia 1 ainda obtém Extremo no `1`. *(R3 permanece em
  aberto para confirmação formal, mas é o comportamento em vigor.)*
- **Perícia ≥ 99 nunca falha** (exceto no `100`). Com Perícia 99, a rolagem `99` passa.
- **Perícias 1 e 2 não alcançam Sucesso Bom.** Com Perícia 1, `teto(0,5) = 1`, e o `1` já
  foi capturado como Extremo. Com Perícia 2, `teto(1) = 1`, mesma situação. Comportamento
  correto e intencional — não é caso de borda a corrigir.
- **Não existe Falha Crítica dependente de Perícia.** O único mau resultado especial é o
  `100` fixo. *(R4 em aberto.)*
- **Rolar sem Perícia é um modo válido**, não um erro. Ver §1.5.

### 1.4 Exemplos trabalhados — ✅ CONFIRMADOS

**Perícia 50** — `teto(25) = 25`

| Rolagem | Resultado |
|---|---|
| 1 | Extremo! |
| 2 – 25 | Sucesso Bom |
| 26 – 50 | Sucesso Normal |
| 51 – 99 | Falha |
| 100 | Desastre! |

O `50` — valor exato da Perícia — agora **passa**. No protótipo, falhava.

**Perícia 45** (ímpar) — `teto(22,5) = 23`

| Rolagem | Resultado |
|---|---|
| 1 | Extremo! |
| 2 – 23 | Sucesso Bom |
| 24 – 45 | Sucesso Normal |
| 46 – 99 | Falha |
| 100 | Desastre! |

No protótipo, o `23` era Sucesso Normal e o `45` falhava.

### 1.5 Rolagem livre — ✅ CONFIRMADA (resolve R8 e R9)

**A tela de rolagem é livre.** O jogador pode rolar sem vincular nada, e *opcionalmente*
escolher uma Perícia para que o resultado seja interpretado.

Consequências:

- **Sem Perícia vinculada:** a rolagem é válida e apenas exibe o número. **Não há
  interpretação de sucesso ou falha** — não existe "Falha por ausência de Perícia". O
  comportamento do protótipo (`NaN` → Falha) era acidental e está descartado.
- **Com Perícia vinculada:** aplica-se a tabela de §1.2 integralmente.
- No modelo de dados isso já é suportado: `roll.target_value` e `roll.outcome` são nulos na
  rolagem livre, e `roll.origin_type` recebe `manual`. Ver
  [03 — Modelo de Dados §2.8](03-modelo-de-dados.md).
- No `ruleset.config`, `onMissingSkill` passa de `"fail"` para `"raw"`.

> **Nota de escopo.** Isso ajusta o que estava em [00 — Visão e Escopo](00-visao-e-escopo.md):
> a rolagem não acontece *somente* a partir da ficha. A tela de dados é livre por natureza, e
> a ficha é um **atalho** que pré-preenche a Perícia. As duas portas existem.

### 1.6 O que ainda falta decidir

| # | Questão | Por que importa |
|---|---|---|
| R3 | 🟨 `1` e `100` devem mesmo ignorar a Perícia? | Confirmação formal do comportamento em vigor. |
| R4 | 🟥 Existe faixa de Falha Crítica além do `100`? | Ex.: `96–100` como no BRP. |
| R5 | 🟥 Existe um quarto grau de sucesso (ex.: `Perícia / 5`)? | O sistema tem "Bom" e "Normal"; sistemas percentuais costumam ter três graus. |
| R6 | 🟥 Existem modificadores? Bônus, penalidade, vantagem/desvantagem, dificuldade? | **Nenhum existe no código.** É a lacuna mais provável de existir só na mesa. |
| R7 | 🟥 Existe teste oposto (jogador vs. jogador, jogador vs. Kiev)? | Combate quase certamente precisa disso. |

Adicionar R4 ou R5 é **inserir um item na lista `bands`** do `ruleset`, não mexer em código.
Ver [ADR-0006](adr/0006-motor-de-regras.md).

---

## 2. Rolagem de Dano

### 2.1 Mecânica — 🟩 FATO

O jogador escolhe **um tipo de dado** e uma **quantidade** `N`. Rola-se `N` vezes o dado
escolhido e apresenta-se a expansão (`4 + 2 + 6`) seguida da **soma** destacada em verde
claro. Com `N = 1`, exibe-se apenas o valor.

Sem modificador, sem crítico, sem tipo de dano, sem mistura de dados diferentes na mesma
rolagem.

### 2.2 Catálogo de dados — 🟩 FATO

```
D2, D3, D4, D6, D8, D10, D20, D30, D40, D50, D60, D70, D80, D90, D100
```

Observações factuais sobre esse conjunto:

- **Não existe D12.** É o único dado poliédrico padrão ausente da lista. Provavelmente
  intencional (o sistema não usa) ou esquecimento. → **Pergunta C1.**
- A escala é irregular: `2, 3, 4, 6, 8, 10`, depois salta de 10 em 10 até `100`.
- `D30` a `D90` não correspondem a dados físicos — são exclusivos do digital.

### 2.3 Pontos que precisam de decisão

| # | Questão |
|---|---|
| C1 | 🟨 A ausência do D12 é intencional? |
| C2 | 🟥 Existe modificador fixo de dano (`2d6+3`)? Vem da ficha, da arma, ou é digitado? |
| C3 | 🟥 O que acontece com um **Extremo!** ou **Sucesso Bom** na rolagem de Ação — o dano é dobrado, maximizado, rola dados extras? |
| C4 | 🟥 Existem tipos de dano (perfurante, corte, impacto, psíquico)? Afetam resistência? |
| C5 | 🟥 O dano precisa misturar dados diferentes numa rolagem (`1d6 + 1d4`)? |
| C6 | 🟥 Existe cura, e ela usa a mesma mecânica? |

---

## 3. Histórico de Rolagens

### 3.1 Estado atual — 🟩 FATO

Array de **strings** em `localStorage`, chave `historico`:

```
Ação:  "Gabriel: 47"
Dano:  "Gabriel: 4 + 2 + 6 = 12"
```

Não grava: o tipo de rolagem, a Perícia usada, o resultado interpretado (Sucesso Bom /
Falha / etc.), timestamp, personagem ou mesa. Cresce sem limite. Só é apagável por inteiro.

### 3.2 Alvo para a plataforma — 🟨 PREMISSA

O próprio site do cliente já especifica o alvo, em `DL_ITEMS`:

> *"Rastreie sua última jogada, com informações do **personagem**, **origem**, cálculo e resultado."*

Logo, o histórico da plataforma grava, por rolagem:
personagem, mesa, **origem** (qual perícia / qual item / qual ação disparou), expressão
rolada, valores individuais de cada dado, total e resultado interpretado, com timestamp.

**"Origem"** é o termo do próprio cliente e merece confirmação: entendemos como *o que
motivou a rolagem* (a Perícia "Furtividade", o item "Faca de Combate"). → **Pergunta H1.**

---

## 4. Ficha de Personagem — ⏸️ EM ABERTO POR DECISÃO DO CLIENTE

**Esta seção fica deliberadamente vazia.** Em 19/08/2026 o cliente pediu para deixar a
ficha em aberto — ele enviará a definição depois.

Nada aqui será presumido, inventado ou preenchido por analogia. Não há lista de perícias,
não há atributos, não há recursos, não há vida ou sanidade. **O documento reflete isso com
honestidade em vez de encher espaço com suposição.**

### 4.1 O único fato disponível

Existe um valor numérico chamado **Perícia**, entre 1 e 100, que é comparado contra o d100
conforme §1.2. É tudo o que se sabe, e é o suficiente para construir a frente de Dados.

### 4.2 O que isso desbloqueia e o que trava

| Frente | Situação |
|---|---|
| **Dados** | **Desbloqueada.** A rolagem livre (§1.5) não depende de ficha, e a rolagem com Perícia só precisa de um número |
| **Ficha** | **Travada** até o cliente enviar a definição |
| **Inventário** | **Travada** — ver §5 |

### 4.3 Por que isso não paralisa o projeto

Porque a ficha é **schema-driven** por decisão arquitetural ([ADR-0005](adr/0005-ficha-schema-driven.md)):
o formato dela é um documento de dados versionado (`sheet_template`), não código.

Quando o cliente enviar a definição, ela vira um `sheet_template` novo — **sem migration,
sem redeploy, sem alterar o renderizador**. É exatamente o cenário para o qual essa decisão
foi tomada, e é a razão de ela ter sido tomada antes de conhecermos o sistema.

Até lá, `sheet_template` v1 fica **vazio**. Ver
[03 — Modelo de Dados §5.5](03-modelo-de-dados.md).

---

## 5. Inventário — 🟥 LACUNA TOTAL

Nada nos protótipos. Nem um item, nem uma regra de carga.

Perguntas bloqueantes na **seção Inventário** de
[06 — Perguntas para o Cliente](06-perguntas-para-o-cliente.md).

Premissa mínima de trabalho 🟨, deliberadamente conservadora — lista de itens por
personagem, com nome, quantidade, descrição e estado *equipado / guardado*, mais um vínculo
opcional a uma expressão de dano que o item dispara. **Sem** peso, capacidade, slots,
durabilidade ou munição até o cliente confirmar que essas mecânicas existem — cada uma
delas é uma regra, não um campo.

---

## 6. Lore com potencial impacto mecânico — 🟥 LACUNA

Três termos aparecem na landing page e podem ser mecânica ou apenas ambientação:

| Termo | Da lore | Precisa saber |
|---|---|---|
| **Kiev** | "monstruosidades grotescas que caçam o que restou da humanidade" | Têm ficha/stats? Precisamos de bestiário no v1? |
| **Ranking de combate** | "territórios brutais regidos pela lei do mais forte e por um sistema de Ranking de combate" | É progressão mecânica do personagem ou worldbuilding? |
| **Organização Resiliência** | "reúne um grupo de elite para uma missão suicida" | Facção com efeito na ficha, ou só narrativa? |
