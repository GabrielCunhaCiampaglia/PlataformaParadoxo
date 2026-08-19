# 00 — Visão e Escopo

## 1. O produto

**Paradoxo Epifânico** é um RPG de mesa indie, narrativo, de ficção apocalíptica com
traços de horror, sci-fi e realismo, com **sistema próprio**.

Hoje o cliente tem: uma landing page bem desenhada e um rolador de dados de arquivo único.
A mesa acontece fora — no Discord, no papel, no improviso.

**A plataforma é o lugar único onde a mesa acontece.** O jogador entra, abre a ficha,
rola os dados a partir dela, gerencia o inventário, e o mestre vê tudo em tempo real.

## 2. Escopo do v1 — três frentes

### 2.1 Dados
Rolagem de **Ação** (d100 contra Perícia, com leitura automática do grau de sucesso) e
rolagem de **Dano** (NdX), **em 3D com física real** — os dados rolam de verdade, com as
faces em branco, e o número se revela por fade ao assentarem
(ver [08 — Rolagem 3D](08-rolagem-3d.md)).

**A tela de rolagem é livre.** O jogador rola quando quiser e *opcionalmente* vincula uma
Perícia para que o resultado seja interpretado; sem Perícia, a rolagem apenas mostra o
número. A ficha e o inventário funcionam como **atalhos** que pré-preenchem a rolagem —
tocar numa Perícia rola aquela Perícia, tocar numa arma rola o dano dela. As duas portas
existem. Histórico estruturado e persistente, com feed em tempo real para a mesa.

### 2.2 Ficha ⏸️
Ficha de personagem digital, **definida por template versionado** e não por código, para
que o sistema do cliente possa evoluir sem redeploy. Editável, sincronizada entre
dispositivos, visível ao mestre.

> **A definição da ficha está em aberto por decisão do cliente (19/08/2026)** — ele enviará
> o formato depois. O template v1 fica vazio até lá. A arquitetura schema-driven
> ([ADR-0005](adr/0005-ficha-schema-driven.md)) existe justamente para que isso não
> paralise as outras frentes.

### 2.3 Inventário
Itens do personagem, com quantidade, estado equipado/guardado e vínculo opcional com uma
rolagem de dano. Escopo mecânico mínimo até o cliente definir as regras de carga.

### 2.4 O que costura tudo: Mesa e Mestre
Hierarquia `Usuário → Mesa → Personagem`. O Mestre cria a mesa, convida por código, vê as
fichas e o histórico de todos, e pode rolar em segredo.

## 3. Fora do escopo do v1

Registrado explicitamente para evitar expansão silenciosa:

- Mapa tático, grid, tokens, fog of war (VTT completo)
- Chat de texto ou voz — a mesa continua no Discord
- Bestiário de Kiev e fichas de NPC (**candidato forte a v1.1**)
- Compêndio de regras / wiki de lore dentro do app
- Loja, pagamentos, financiamento do livro e da HQ
- Publicação em Play Store / Microsoft Store
- Criação de personagem guiada por assistente (o v1 tem ficha editável, não wizard)

## 4. Personas

| Persona | Precisa de |
|---|---|
| **Jogador** | Abrir a ficha no celular na mesa, rolar rápido, ver o resultado interpretado sem consultar tabela, atualizar vida e itens. |
| **Mestre** | Ver a ficha de todos, acompanhar as rolagens em tempo real, rolar oculto, gerenciar quem está na mesa. |
| **Cliente / autor do sistema** | Ajustar as regras e o formato da ficha conforme o sistema evolui, **sem depender de deploy**. |

## 5. Decisões já fechadas

| Tema | Decisão | ADR |
|---|---|---|
| Escopo v1 | Dados + Ficha + Inventário, dentro de Mesa com Mestre | [0001](adr/0001-escopo-v1.md) |
| Persistência | Backend com contas — Supabase | [0002](adr/0002-backend-supabase.md) |
| Repositório | Monorepo novo | [0003](adr/0003-monorepo.md) |
| Distribuição | PWA instalável (Windows + Android) | [0004](adr/0004-pwa.md) |
| Ficha | Schema-driven, template versionado em JSONB | [0005](adr/0005-ficha-schema-driven.md) |
| Regras | Motor puro, testável, isolado da UI | [0006](adr/0006-motor-de-regras.md) |
| Front-end | React + Vite + **TypeScript obrigatório** | [0007](adr/0007-stack-frontend.md) |
| i18n | Chaves estáveis substituem o dicionário por string PT | [0008](adr/0008-i18n.md) |
| Tempo real | Feed de rolagens ao vivo na mesa, com rolagem oculta | [0009](adr/0009-tempo-real.md) |
| Rolagem 3D | three.js + cannon-es, com rotulagem pós-simulação | [0010](adr/0010-rolagem-3d.md) |
| Infraestrutura | Cloudflare Pages + Supabase Free + cron de keep-alive — R$ 0/ano | [0011](adr/0011-deploy-e-infraestrutura.md) |

## 6. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| **O sistema de RPG não está documentado.** Só o rolador existe. | **Alto** — ficha e inventário não podem ser especificados a fundo | Ficha schema-driven ([ADR-0005](adr/0005-ficha-schema-driven.md)) + [lista de perguntas](06-perguntas-para-o-cliente.md) tratada como bloqueio de fase |
| O cliente muda as regras durante o desenvolvimento | Médio | Regras em configuração versionada, não em código ([ADR-0006](adr/0006-motor-de-regras.md)) |
| A comparação `<` vs `<=` (R1) pode ser um bug antigo | Médio — muda o balanceamento de todo personagem | Perguntar antes de implementar; configurável de qualquer forma |
| Escopo escorregar para VTT completo | Alto — é onde projetos indie travam | §3 deste documento é o contrato do que fica de fora |
| O design do protótipo é pesado (shader WebGL, blur, grain) para uso no celular na mesa | Médio | O visual da landing não vai inteiro para dentro do app; ver [05 — Design System](05-design-system.md) §6 |

## 7. Critério de conclusão da fase de documentação

A fase termina — e o desenvolvimento começa — quando:

1. ~~As perguntas **BLOQUEANTES** de rolagem e design estiverem respondidas.~~
   ✅ **R1, R2, R8, R9 e D1 respondidas em 19/08/2026.**
2. **R4–R7** (Falha Crítica, grau extra de sucesso, modificadores, teste oposto) estiverem
   respondidas — é o que falta para a frente de Dados ficar completa.
3. Os documentos 02, 03 e 05 estiverem revisados pelo cliente.
4. ~~Existir um `sheet_template` v1 concreto.~~ ⏸️ **Dispensado:** a ficha ficou em aberto
   por decisão do cliente e o template v1 é publicado vazio.

**As Fases 1 e 1.5 já podem começar** — nenhuma delas depende de resposta pendente.
