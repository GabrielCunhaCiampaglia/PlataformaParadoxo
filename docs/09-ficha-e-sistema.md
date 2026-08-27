# 09 — Ficha e Sistema

Extraído do PDF **"Paradoxo Epifânico - FICHA"**. Recebido em 20/08/2026 com 9
páginas; reenviado em 27/08/2026 com 51 — mesmo conteúdo de ficha, mais o catálogo
de itens da §13 e a ambientação da §13.6. As páginas extras são arte.

> Este documento substitui a lacuna que existia em [02 §4 e §5](02-regras-do-sistema.md).
> Ele é a base do `sheet_template` v2 e do seed do banco.
>
> **Selos:** ✅ está no PDF · ⚠️ contradição a resolver · ❓ o PDF não diz

---

## 1. Identidade — ✅

| Campo | Notas |
|---|---|
| Jogador | Pessoa real, não o personagem |
| Patente | Dentro da Resiliência |
| Personagem | Nome |
| Apelido | Opcional |
| **Afiliação** | `RESILIÊNCIA` · `MISS` · `KILL` — três valores impressos na ficha ❓ o significado de MISS e KILL |
| Idade · Gênero · Nacionalidade · Altura · Peso | |
| **Salário** | Em **$ CAD** — a moeda do mundo é o dólar canadense (o impacto foi em Nunavut, Ártico canadense) |
| Celular | |
| Organizações Amigas · Conexões Importantes | |
| **Classe** | Uma só. Ver §5 |
| Profissão Anterior · Motivação Principal | |
| Mascote | Opcional |
| História Breve | Texto longo |

---

## 2. Recursos — ✅

Cinco, cada um com valor **Atual**:

| Recurso | Regra |
|---|---|
| **Vida** | Traços alteram a base: `VIVAÇO +15`, `CORAÇÃO DE FERRO +25` |
| **Sanidade** (Psicológico) | **Perder 5 ou mais numa sessão → adquire algo de PANDORA.** Ver §7 |
| **Energia** | ❓ Como é gasta e recuperada |
| **Mana** | Também é uma perícia. ❓ Como se relacionam |
| **Contato com o Oculto** | **Não pode chegar a 100.** Cada 5 perdas de Sanidade dá **+20** aqui |

❓ Valores iniciais e máximos de cada recurso não constam no PDF.

---

## 3. Perícias — ✅

**33 perícias**, todas roladas em d100:

```
ADESTRAMENTO · AGILIDADE · ARTES · ATAQUE · CARISMA · CIÊNCIAS · COMBATE
CORAGEM · CREDULIDADE · CRIATIVIDADE · CRIME · DISFARCE · ESCUDO · ENCONTRAR
FORÇA · FURTIVIDADE · INICIATIVA · INTIMIDAÇÃO · INTUIÇÃO · INVESTIGAÇÃO
LÁBIA · LUTAR PELA VIDA · MANA · MEDICINA · MEMÓRIA · MIRA · OCULTISMO
PILOTAGEM · REFLEXO · RESISTÊNCIA · SORTE · SOBREVIVÊNCIA · TECNOLOGIA
```

⚠️ **`ATAQUE DE TIRO`** aparece na seção de Habilidades e no traço *Sombra do Chumbo*
("Perícia de Ataque Tiro muda o valor para 90"), mas **não está na lista de perícias**.
É a 34ª perícia ou outra coisa? → **Pergunta S1**

### 3.1 Estrutura de cada perícia — ✅

A ficha tem quatro colunas: **Dado · Pontos · Bônus · Total**, no formato `[pontos] + [bônus] = [total]`.

- **Pontos** — distribuídos pelo jogador
- **Bônus** — vem dos Traços
- **Total** — o valor usado no d100

Isso mapeia direto no modelo: `skill.points`, `skill.bonus`, `skill.total` (derivado).

### 3.2 Distribuição — ✅ com ⚠️

- **231 pontos** para distribuir
- **Máximo de 70** numa perícia, na distribuição inicial
- Com bônus de traço, o teto sobe para **85**
- Traços bloqueados podem **fixar** perícias em 90 ou 95, ignorando o teto
- **"É estritamente proibido juntar pontos, você deve usá-los"** — não se poupa ponto
- Se um bônus de traço estouraria 85, o excedente é **redistribuído** em outras perícias

> ⚠️ **Contradição matemática.** A página 7 afirma que as perícias são *"sempre acima de 45
> ou 45"*. Mas 231 pontos divididos por 33 perícias dão média 7. Para todas começarem em 45
> seria preciso um valor-base de 45 por perícia **antes** da distribuição — o que o PDF não
> menciona. → **Pergunta S2**, e ela é bloqueante para a criação de personagem.

---

## 4. Habilidades — ✅ parcial

Quatro slots, pagos com os mesmos pontos das perícias:

| # | Tipo | Custo |
|---|---|---|
| 1 | Ataque | −10 |
| 2 | Defesa | −15 |
| 3 | Ataque | −10 |
| 4 | **Ultimate** | −25 |

Total: **−60 pontos**. ❓ Saem dos 231, ou é um orçamento separado? → **Pergunta S3**

❓ Não há catálogo de habilidades no PDF — o jogador inventa e o Mestre aprova?
O PDF diz apenas: *"Para habilidades ou ataques especiais, o cálculo pode variar de acordo
com as condições da habilidade."* → **Pergunta S4**

---

## 5. Classes — ✅

**Escolhe-se apenas uma.** Seis:

| Classe | Conceito |
|---|---|
| **COLOSSO** | Resistência física, absorve dano, protege aliados |
| **INVESTIGADOR** | Inteligência e furtividade, enigmas, combate planejado |
| **KRAFTOR** | Manipula mana, extrai poder bruto da Krafta |
| **LAMINAR** | Corpo a corpo rápido e letal, lâminas |
| **OCULTISTA** | Rituais, Krafta em forma suja, sobrenatural |
| **SENTINELA** | Combate à distância, precisão |

❓ A classe dá bônus mecânico, ou é só conceito e restrição de traços? A ficha diz que
*"os traços devem ser compatíveis com sua classe"*. → **Pergunta S5**

---

## 6. Traços — ✅

**43 no total: 31 liberados + 12 bloqueados.** Cada traço dá bônus numérico em perícia(s)
**e** uma vantagem de jogo. O jogador preenche **4 lotes**; mais que isso, consultar o Mestre.
Os bloqueados são desbloqueados durante a campanha, conforme as escolhas do jogador.

### 6.1 Liberados (31)

| Traço | Bônus | Efeito |
|---|---|---|
| Arisco no Piloto | Pilotagem +15 | Pula os dados e vai direto ao destino |
| Atleta | Agilidade +5, Força +6 | Não gasta ação para pular/atravessar obstáculos |
| Caixa Preta | Memória +20 | Câmera fotográfica que não ocupa espaço |
| Cleptomaníaco | Crime +15 | Vantagem em furtar e manipular objetos pequenos |
| Couraça | Resistência +20 | **Reduz o dano em 5 em cada ataque recebido** |
| Crença | Credulidade +25 | Mantém sanidade sob efeito do oculto |
| Curioso | Encontrar +10, Investigação +10 | Pistas adicionais **com um teste bom** |
| Desbravador | Sobrevivência +20 | Localiza suprimentos e abrigo com facilidade |
| Desenhista | Artes +25 | Papel e caneta sem ocupar espaço; vantagem em Artes |
| Doutor | Medicina +10 | **Cura +5 de vida adicional por tratamento** |
| Errático | Reflexo +10 | Esquiva e contra-ataca com vantagem |
| Farsante | Disfarce +20, Lábia +8 | Máscara sem ocupar espaço |
| Furtivo | Furtividade +10 | **Triplo de vantagem** no ataque furtivo |
| Inovador | Criatividade +15 | Cria ferramentas e itens com vantagem |
| Línguas | Ocultismo +20 | Compreende línguas do oculto |
| Mão de Fios | Lábia +15, Carisma +8 | Manipula e mente com vantagem |
| Mira Laser | Mira +15 | Ataque à distância com vantagem, mais um movimento |
| Sede de Sangue | Ocultismo +20 | Rituais sem ingredientes |
| Perspicaz | Encontrar +8, Intuição +10 | Acha informações em locais aleatórios |
| Por Todos | Escudo +10 | **+3 de vida** ao proteger quem importa e perder |
| Programador | Tecnologia +20 | Invade sistemas com pen-drive |
| Quebra-Ossos | Ataque +10, Força +10 | **+10 de dano base** corpo a corpo |
| Seguro de Si | Carisma +20, Lábia +8 | Ignora intimidação e manipulação mental |
| Sexto Sentido | Intuição +20 | Descobre mentiras com vantagem |
| Só Vive Uma Vez | Sorte +20, Coragem +20 | **Re-rola um dado ruim, 1× por sessão** |
| Estratégico | Iniciativa +18 | Vantagem nas duas primeiras ações |
| Tigre | Intimidação +20 | Sai de combate colocando o inimigo para correr (exceto boss) |
| Velocista | Agilidade +10 | **2 ações adicionais de deslocamento** |
| Vivaço | **Vida base +15**, Lutar pela Vida +20 | Rola Lutar pela Vida 2× no RPG |
| Virtuoso | **Sanidade +10** | Rola Sanidade com vantagem |
| Zoolover | Adestramento +25 | Acalma/influencia animais com vantagem |

### 6.2 Bloqueados (12)

| Traço | Efeito |
|---|---|
| Aprendiz | **+15 em TODAS as perícias** |
| Berserkers | Força, Escudo, Ataque e Reflexo **fixados em 95** |
| Comandante | Iniciativa +30; após teste normal, o grupo obedece sem consentimento |
| Coração de Ferro | **Vida base +25**; regenera 3 de vida após cada ataque |
| Intelecto Ancestral | Sabe qualquer coisa que queira aprender ou descobrir |
| Líder dos Caídos | Adestramento **fixado em 95** |
| Luminar | Mana pura que cura qualquer coisa; regenera 15 de Vida |
| Sombra do Chumbo | Ataque de Tiro **fixado em 90**; vantagem tripla em Mira |
| Transcendente | Forma não humana; consultar o Mestre |
| Visão do Futuro | Intuição **fixada em 90**; prevê ações |
| Vingador | Agilidade e Ataque **fixados em 90**; +1 ação a cada kill |
| Voz do Éter | Intuição **fixada em 90**; ouve vozes do oculto |

### 6.3 Consequência para o modelo

Traços não são decorativos: eles **alteram valores derivados** (bônus de perícia, vida base)
e **modificam regras** (redução de dano, re-rolagem, dano adicional). A parte numérica cabe
no campo `bonus` de cada perícia; a parte de regra é texto para o Mestre aplicar.

**Não vamos automatizar os efeitos de regra no v1.** Só o bônus numérico é calculado.

---

## 7. PANDORA — ✅

Sistema de degradação mental.

- Perder **5 ou mais** de Sanidade numa sessão → adquire algo de PANDORA
- A cada **5 perdas** de Sanidade → uma **doença** + **20 pontos** de Contato com o Oculto
- **"Tudo que há em Pandora reflete no valor das perícias também"** — condições dão penalidade
- É **personalizável**: pode surgir na hora da sessão, sem precisar estar na lista

Três categorias, com exemplos no PDF:

| Categoria | Exemplos |
|---|---|
| **Traumas** (10) | Amnésia Dissociativa, Depressão Psicótica, Despersonalização, Desrealização, Mutismo Seletivo, Remorso, Síndrome do Sobrevivente, TEPT, Transtorno de Pânico, TDI |
| **Doenças** (11) | Ansiedade, Depressão, Huntington, ELA, Fibromialgia, Insônia Fatal Familiar, Capgras, Cotard, Estocolmo, Guillain-Barré, Marfan |
| **Fobias** (10) | Aicmofobia, Agorafobia, Atelofobia, Catoptrofobia, Claustrofobia, Hematofobia, Hodofobia, Nictofobia, Tafefobia, Thanatofobia |

❓ Qual a penalidade concreta de cada condição nas perícias? O PDF não quantifica.
→ **Pergunta S6**

> **Nota de produto.** Esta seção usa nomes de transtornos e doenças reais. É escolha
> criativa do autor e não cabe a nós julgá-la — mas vale saber que a plataforma vai exibir
> esses termos a jogadores, e alguns podem conviver com essas condições. Uma linha de aviso
> na entrada da mesa resolve, e é barata. → **Pergunta S7**

---

## 8. Inventário — ✅ *(responde I1, I3, I4, I9)*

Sistema de **espaços**, não de peso livre.

| Regra | Valor |
|---|---|
| Capacidade | **Carga Máxima** + **Bolsos** |
| Conversão | **1 bolso = 2 espaços** |
| Locais | **Mochila/Bolsa** e **Bolso**, listados separadamente |

### 8.1 Escala de tamanho

| Porte | Espaços | Exemplos |
|---|---|---|
| Pequeno | 1 | Remédios, munição, chaves, papéis, carteira |
| Médio | 2–3 | Adagas, livros, ferramentas pequenas |
| Grande | 4–6 | Arcos, suprimentos, armas de pequeno porte |
| Muito grande | 8–10 | Armas de grande porte, espadas |

*"Consulte o mestre. Os itens citados são exemplos, eles podem variar ocupação."*

> ⚠️ **Contradição: "espaços" ou "peso"?** A tabela de itens usa **PESO** — Corda (peso 3),
> Machado (peso 8), **Escudo Balístico (peso 40)**. Mas a escala acima vai só até 10 espaços.
> Um escudo de peso 40 não cabe em nenhuma categoria. São dois sistemas, ou o mesmo com
> nomes trocados? → **Pergunta S8**, bloqueante para o inventário.

### 8.2 Alguns traços dão itens que **não ocupam espaço**

Caixa Preta (câmera), Desenhista (papel e caneta), Farsante (máscara). O modelo precisa de
uma marca `ocupaEspaco: false`.

### 8.3 Economia — ✅

Existe dinheiro, em **$ CAD**, com catálogo de preços no PDF: remédios, equipamentos, armas
e tratamentos. Os preços *"variam de região para região"*.

---

## 9. Dano — ✅ *(responde C2, C3, C5, C6)*

### 9.1 Tabela de auto-ataque

| Tipo | Dano | | Tipo | Dano |
|---|---|---|---|---|
| Arcos | `2d10` | | Krafta | `1d20` |
| Armas de fogo grandes | `2d20` | | Machados | `2d20` |
| Armas de fogo pequenas | `1d20` | | Mordida | `1d6 + 1d100 Sanidade` |
| Bastão | `1d10 + Acessórios` | | Pedras | `1d6` |
| Cabeçada | `1d6 + 1d100 Resistência` | | Soco | `1d3 + Acessórios` |
| Chute | `1d3` | | Vidros | `1d10` |
| Coronhada | `AG = 1d10 / AP = 1d6` | | Espadas | `1d10` |
| Enforcada | `1d6 + 1d100 Resistência` | | Facas | `1d6` |
| Joelhada | `1d3` | | | |

*"Esses danos são somente os AA (Auto-Ataques). O dano das habilidades não tem nada a ver
com essa tabela."*

### 9.2 Três correções ao que estava documentado

| Antes | Agora | Evidência |
|---|---|---|
| `allowModifier: false` | ✅ **true** | `1d10 + Acessórios` |
| `allowMixedDice: false` | ✅ **true** | `1d6 + 1d100 Resistência` |
| C3 em aberto | ✅ **Extremo = dano máximo** | Ver §9.3 |

### 9.3 Crítico — ✅ C3 RESPONDIDA

> *"Se o personagem quer dar um chute (que o dano é 1d6), ele terá que rolar o d100. **Se cair
> extremo, o dano deverá ser o máximo**, ou seja, o chute dará 6 de dano. Se cair os sucessos,
> o jogador terá que rolar o dano."*

**Rolagem de Ação `1` → o dano é maximizado automaticamente, sem rolar.**

Isso liga Ação e Dano numa sequência única, e é a integração mais importante da frente de
Dados. ❓ E no `100` (Desastre)? O dano é zero, mínimo, ou volta contra o jogador?
→ **Pergunta S9**

### 9.4 Cura — ✅ C6 RESPONDIDA

| Tratamento | Custo | Efeito |
|---|---|---|
| Leve | $100 CAD | Restaura `1d6` de Vida **com vantagem** |
| Moderado | $200 CAD | Restaura `1d10` de Vida **com vantagem** |
| Grave | $500 CAD | Restaura `1d20` de Vida **com vantagem** |

---

## 10. Vantagem — ✅ existe, ❓ mecânica *(responde R6 em parte)*

A palavra **vantagem** aparece por toda a ficha: nos traços, nos tratamentos, nas ações.
Há também **"triplo de vantagem"** (Furtivo) e **"vantagem tripla"** (Sombra do Chumbo).

❓ **O PDF nunca define o que vantagem faz mecanicamente.** Rolar dois d100 e pegar o menor?
Um bônus fixo? E o que "vantagem tripla" multiplica? → **Pergunta S10, bloqueante.**

É o modificador central do sistema e não está especificado.

---

## 11. O que o PDF confirma sobre as regras de rolagem

> *"Para realizar uma ação, o jogador rola o D100. O resultado deve ser **igual ou inferior**
> ao valor da perícia. Se o personagem tem 45 em Força, ele precisa tirar **45 ou menos**."*

✅ **Confirma R1 por escrito.** A comparação é `<=`, e o motor já está correto.

> *"**1 no D100**: Sucesso extremo. **100 no D100**: Fracasso extremo."*

✅ Confirma R3 — os absolutos independem da Perícia.

### ⚠️ Mas o PDF não menciona "Sucesso Bom"

A página 7 descreve apenas **sucesso**, **falha** e os dois extremos. Não há qualquer menção
a `Perícia / 2` nem a graus de sucesso.

Porém o **rolador tem** Sucesso Bom, o autor **confirmou o arredondamento para cima** em
19/08, e o traço **Curioso** diz *"Descobre pistas adicionais com um teste bom"* — o que prova
que "teste bom" é um conceito vivo do sistema.

**Conclusão:** a página 7 do PDF está **desatualizada** em relação ao sistema em uso. O motor
mantém a tabela de quatro faixas confirmada em 19/08. → **Confirmar em S11.**

---

## 12. Perguntas novas geradas por este documento

| # | Prioridade | Pergunta |
|---|---|---|
| **S2** | 🔴 | As perícias começam em 45 (base) e aí distribui-se 231 pontos, ou os 231 são o total? A conta não fecha: 231 ÷ 33 = 7 |
| **S8** | 🔴 | Inventário é por **espaços** (1–10) ou por **peso** (o escudo balístico é 40)? São a mesma coisa? |
| **S10** | 🔴 | **O que "vantagem" faz mecanicamente?** E "vantagem tripla"? |
| **S11** | 🟠 | Confirmar que "Sucesso Bom" (`teto(P/2)`) vale, mesmo não constando na página 7 do PDF |
| S1 | 🟠 | `ATAQUE DE TIRO` é a 34ª perícia? |
| S3 | 🟠 | Os 60 pontos das Habilidades saem dos 231? |
| S4 | 🟠 | Existe catálogo de Habilidades, ou o jogador cria e o Mestre aprova? |
| S5 | 🟠 | A Classe dá bônus mecânico, ou só restringe traços? |
| S6 | 🟠 | Qual a penalidade concreta de cada condição de PANDORA nas perícias? |
| S9 | 🟠 | No Desastre (100), o que acontece com o dano? |
| S7 | 🟡 | Aviso de conteúdo na entrada da mesa, pelos nomes de transtornos reais? |
| S12 | 🟡 | Valores iniciais e máximos de Vida, Sanidade, Energia, Mana e Contato com o Oculto |
| S13 | 🟡 | O que significam **MISS** e **KILL** no campo Afiliação? |

---

## 13. Catálogo de itens — ✅ *(PDF de 51 páginas, recebido em 27/08/2026)*

O PDF entregue em 27/08 traz o mesmo conteúdo de ficha do anterior (de 9 páginas)
e acrescenta o que faltava para o inventário: **um catálogo de itens com espaço
ocupado e preço**. As páginas extras são arte.

> ⚠️ **Os preços não estão aqui.** A coluna de valores saiu desalinhada das linhas
> na extração de texto — o `TRANSTORNOS PSICOLÓGICOS`, que é cabeçalho, aparece com
> preço, e a corda de 10 m sai mais cara que a lanterna. Transcrever isso seria
> inventar número de economia. Os **espaços saíram limpos**, porque vêm dentro do
> próprio nome do item. Ver **S14**.

### 13.1 `PESO` no catálogo é `ESPAÇO` na ficha — ✅ resolve S8

A ficha fala em espaços e o catálogo em peso, mas a escala bate exatamente com a
tabela de tamanho de §8.1: espingarda 10, machado 8, machete 6, faca 4, caneta 1.
São o mesmo número com dois nomes.

**A exceção confirma a regra:** o escudo balístico é 40, muito além dos 8–10 de
"muito grande". Ele não é item de mochila — é carregado na mão ou nas costas. Ver
**S15**.

### 13.2 Equipamentos

| Grupo | Item | Espaços |
|---|---|---|
| Básicos | Corda (10 m) | 3 |
| Básicos | Lanterna | 3 |
| Básicos | Lanterna UV / luz negra | 3 |
| Básicos | Walkie-talkie | 2 |
| Básicos | Pano multiuso | 2 |
| Básicos | Bíblia | 3 |
| Básicos | Mapa | 2 |
| Básicos | Bastão de caminhada | 8 |
| Básicos | Lupa | 2 |
| Básicos | Bloco de notas | 3 |
| Básicos | Caneta azul · preta · vermelha | 1 cada |
| Combate | Anel lâmina secreta | 1 |
| Combate | Taser | 2 |
| Combate | Mini faca | 3 |
| Combate | Granada de mão | 3 |
| Combate | Karambit · Faca tática | 4 |
| Combate | Colete à prova de balas | 4 |
| Combate | Machadinha | 5 |
| Combate | Bomba molotov | 5 |
| Combate | Munição diversa (30 und) | 5 |
| Combate | Pistola Glock 17 (9 mm) | 5 |
| Combate | Pistola Taurus PT 1911 (.45 ACP) | 5 |
| Combate | Machete | 6 |
| Combate | Pistola Desert Eagle (.50 AE) | 6 |
| Combate | Revólver Magnum .44 | 6 |
| Combate | Machado | 8 |
| Combate | Rifle M4 Carbine (5.56 mm) | 8 |
| Combate | Rifle AK-47 (7.62 mm) | 8 |
| Combate | Shotgun | 9 |
| Combate | Espingarda (12 gauge) | 10 |
| Combate | **Escudo balístico** | **40** ⚠️ ver §13.1 |
| Tech | Binóculos | 3 |
| Tech | Notebook Dell | 4 |
| Tech | Drone | 4 |
| Tech | Maleta de ferramentas | 5 |
| Tech | Serra elétrica | 8 |

### 13.3 Remédios

O catálogo dá **nome e preço, mas não espaço** — pela escala de §8.1, remédio é
"pequeno (1 espaço)". Ver **S16**.

- **Transtornos psicológicos:** Agomelatina (Valdoxan), Alprazolam (Frontal/Xanax),
  Amitriptilina, Bupropiona (Wellbutrin), Clonazepam (Rivotril), Diazepam (Valium),
  Fluoxetina (Prozac), Melatonina, Sertralina (Zoloft), Trazodona, Venlafaxina
  (Efexor), Haloperidol (Haldol), Olanzapina (Zyprexa), Quetiapina (Seroquel),
  Risperidona (Risperdal), Zolpidem (Stilnox)
- **Doenças neurológicas e físicas:** Baclofeno, Dipirona, Gabapentina, Ibuprofeno,
  Levodopa (Parkinson), Morfina sintética, Pregabalina (Lyrica), Tramadol, Codeína,
  6-APB, Corticosteroides (Prednisona), Imunossupressores (Azatioprina)
- **Infecções, ferimentos e suporte médico:** Amoxicilina, Ciprofloxacino, Vancomicina
- **Medkit:** Kit de primeiros socorros, Kit medicina avançada

### 13.4 Tratamentos — ✅ confirma §9.4

| Tratamento | Custo | Cura |
|---|---|---|
| Leve | $ 100 CAD | `1d6` com vantagem |
| Moderado | $ 200 CAD | `1d10` com vantagem |
| Grave | $ 500 CAD | `1d20` com vantagem |

O preço varia por Região. Os três usam **vantagem**, que continua sem definição
mecânica — é o que torna **S10** bloqueante para o inventário, e não só para a
rolagem.

### 13.5 O catálogo de dados, confirmado

O PDF lista textualmente: `d2 d3 d4 d6 d8 d10 d20 d30 d40 d50 d60 d70 d80 d90 d100`.
São os 15 do [doc 03](03-catalogo-de-dados.md), e confirma que o d100 do dano é
rolagem de valor, não o par percentual da ação.

### 13.6 Ambientação — novo

O PDF traz a história do mundo, que até agora não estava documentada em lugar
nenhum e importa para a direção de arte: impacto de um meteoro em **Nunavut,
Ártico canadense, em 2026**; nuvens cinzentas permanentes; colapso da internet e
da comunicação global; criaturas chamadas **Kiev**; a **Organização Resiliência**,
que é quem convoca os personagens. É o que justifica o `$ CAD` e o campo Afiliação.

---

## 14. Perguntas novas desta entrega

| # | Prioridade | Pergunta |
|---|---|---|
| **S14** | 🔴 | Os **preços** do catálogo saíram desalinhados na extração. Preciso das páginas de Remédios e Equipamentos como imagem, ou de uma planilha |
| **S15** | 🟠 | O escudo balístico (40) não cabe em mochila nenhuma. Existe slot de **equipado** separado do inventário? |
| **S16** | 🟠 | Remédio ocupa 1 espaço cada, ou um frasco/caixa conta como um item só? |
| **S17** | 🟡 | `CARGA MÁXIMA` da ficha sai de qual conta — Força, Resistência, valor fixo? |
