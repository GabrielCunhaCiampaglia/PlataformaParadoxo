# 07 — Roadmap

> As fases são sequenciais em dependência, não necessariamente em calendário.
> Não há estimativa de prazo aqui: enquanto as perguntas 🔴 de
> [06](06-perguntas-para-o-cliente.md) não voltarem, qualquer número seria chute.

---

## Fase 0 — Documentação *(atual)*

- [x] Análise dos três protótipos
- [x] Extração das regras existentes, com marcação FATO / PREMISSA / LACUNA
- [x] Decisões de arquitetura registradas em ADR
- [x] Modelo de dados especificado
- [x] Design system extraído e documentado
- [x] Lista de perguntas consolidada
- [ ] **Conversa com o cliente sobre as perguntas 🔴**
- [ ] Revisão dos documentos 02, 03 e 05 pelo cliente
- [ ] `sheet_template` v1 escrito e aprovado

**Saída:** especificação aprovada. Sem isso, a Fase 2 não pode começar.

---

## Fase 1 — Fundação *(pode começar em paralelo à conversa com o cliente)*

Nada aqui depende das regras do RPG. É o único trabalho seguro de adiantar.

- Monorepo pnpm, TypeScript, ESLint, Vitest, CI
- `packages/design-system`: tokens extraídos do protótipo + primitivos
  (`Panel`, `Button`, `Pill`, `Input`, `Noise`) + Storybook
- Projeto Supabase, migrations iniciais (`profile`, `game_table`, `table_member`), RLS
- Autenticação: cadastro, login, recuperação de senha
- Casca do PWA: manifest, service worker, instalação
- `apps/site`: migração da landing do cliente para consumir o design system
- **Infraestrutura** ([ADR-0011](adr/0011-deploy-e-infraestrutura.md)): Cloudflare Pages
  ligado ao repositório, domínio `plataformaparadoxo.pages.dev`, e o Worker de cron com as
  duas funções — **keep-alive diário** (sem ele o Supabase pausa em 7 dias) e **backup
  periódico** (o plano grátis não tem backup nenhum; perder as fichas de uma campanha é o
  pior desfecho possível). O backup não é item de acabamento — entra aqui.

**Saída demonstrável:** o cliente cria conta, entra, cria uma mesa e convida alguém.

---

## Fase 1.5 — Prova de conceito da rolagem 3D *(3 dias, independente das regras)*

Valida a hipótese que sustenta o [ADR-0010](adr/0010-rolagem-3d.md) **antes** de qualquer
investimento em arte. Não depende de nenhuma resposta do cliente — o que a torna o trabalho
técnico mais seguro de adiantar depois da Fase 1.

- Harness headless em Node, 50.000 simulações, cinco geometrias
- Teste de rotulagem pós-simulação: leitura visual = valor do motor, 100 de 100
- Medição em Android intermediário real: p95 de CPU, fps e temperatura

Critérios objetivos de aprovação e planos B em [08 — Rolagem 3D §4](08-rolagem-3d.md).

**Saída:** um número que diz se a arquitetura escolhida se sustenta, ou qual plano B assumir.

---

## Fase 2 — Dados 🔓 *parcialmente destravada*

> **R1, R2, R8 e R9 respondidas em 19/08/2026.** A tabela de resultados está fechada e o
> motor de regras já pode ser escrito e testado por completo. Faltam **R4–R7, C2 e C3**,
> que adicionam faixas e modificadores — e, pelo [ADR-0006](adr/0006-motor-de-regras.md),
> adicionar faixa é inserir item numa lista de configuração, não reescrever código.
>
> Também depende da **Fase 1.5**.

- `packages/rules`: motor puro, com o interpretador de expressão restrito
- Suíte de testes cobrindo toda a tabela de resultados e as bordas confirmadas:
  rolagem **igual** à perícia (agora passa), perícia ímpar (`teto`), perícias 1 e 2 (que não
  alcançam Sucesso Bom), perícia ≥ 99, rolagem **livre sem perícia**, `1` e `100`
- Tela de rolagem **livre**, com vínculo opcional de Perícia
- `packages/dice-3d`: as cinco geometrias, tray, materiais, iluminação e a revelação por fade
- Telas de Rolagem de Ação e Rolagem de Dano, com o visual do protótipo
- Persistência de `roll` e histórico estruturado
- Feed em tempo real da mesa + rolagem oculta do Mestre

**Saída demonstrável:** substitui o rolador atual com folga. Já é entregável sozinho.

---

## Fase 3 — Ficha ⏸️ *aguardando a definição do cliente*

> A ficha ficou **em aberto por decisão do cliente** (19/08/2026). O `sheet_template` v1 é
> publicado vazio; a definição chega depois e vira o v2, sem migration nem redeploy.

O trabalho que **não** depende da definição pode ser feito desde já:

- `packages/sheet-schema`: tipos e validação do template
- Renderizador de ficha dirigido pelo template — ele é genérico por natureza
- Edição com salvamento otimista e sincronização

O que espera a definição: o conteúdo do template e a **integração com a Fase 2** (tocar numa
Perícia rola aquela Perícia). Também depende de **M4** — se o Mestre edita a ficha do jogador.

**Saída demonstrável:** ficha real, jogável, com rolagem integrada. É aqui que a
plataforma passa a ser "única".

---

## Fase 4 — Inventário 🔒 *depende de I1–I4*

- CRUD de itens, ordenação, equipar
- Rolagem de dano direto do item
- Regras de carga e efeitos de item equipado, **se** existirem (I1, I2, I5)

---

## Fase 5 — Acabamento

- Offline de verdade: fila de rolagens, edição offline, resolução de conflito
- Painel do Mestre: visão consolidada das fichas da mesa
- i18n com chaves estáveis (PT-BR / EN / JA), reaproveitando as traduções da landing
- Passe de acessibilidade (contraste, alvos de toque, foco, `prefers-reduced-motion`)
- Passe de performance em Android intermediário
- Instalação testada em Windows e Android

---

## Candidatos a v1.1

Registrados para não virarem escopo v1 por acidente:

- Bestiário de Kiev e fichas de NPC (M5)
- Painel de administração de `ruleset` e `sheet_template` para o cliente (A3)
- Rolagem validada no servidor (A1)
- Catálogo de itens pré-definido (I8)
- Compêndio de regras / lore dentro do app
- Mapa, tokens, grid — o VTT completo
