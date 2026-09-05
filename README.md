# Paradoxo Epifânico — Plataforma

Plataforma única para jogar o RPG **Paradoxo Epifânico**, sistema próprio e indie
(ficção apocalíptica, horror / sci-fi / realismo).

> **Estado: em desenvolvimento.** O motor de regras, os dados 3D, a mesa e o
> painel da ficha estão escritos e testados (168 testes). O que ainda **não**
> existe é toda a Fase 1: Supabase, contas, mesa multijogador, service worker,
> CI e o Worker de keep-alive/backup. Ver [07 — Roadmap](docs/07-roadmap.md).

## Escopo do v1 — três frentes

| Frente | O que é |
|---|---|
| **Dados** | Rolagem de Ação (d100 vs. Perícia) e Rolagem de Dano (NdX) **em 3D com física real**, com leitura automática de sucesso/falha, histórico persistente e feed em tempo real para a mesa. |
| **Ficha** | Ficha de personagem digital, definida por template versionado, editável e sincronizada entre dispositivos. |
| **Inventário** | Gestão de itens do personagem, com equipar/usar e integração com as rolagens. |

Tudo acontece dentro do conceito de **Mesa** (campanha), com papel de **Mestre**.

Projeto de **uso pessoal e comunitário**, não comercial. Infraestrutura de **custo zero**
([ADR-0011](docs/adr/0011-deploy-e-infraestrutura.md)).

## No ar

**<https://gabrielcunhaciampaglia.github.io/PlataformaParadoxo/>** — publicado a cada
push no `main` pela [Action](.github/workflows/pages.yml), que também roda os testes e a
checagem de tipos.

| Rota | O que é |
|---|---|
| `/` | Rolagem de Ação e de Dano, com histórico local |
| `/mesa` | A mesa 3D e o painel da ficha |
| `/poc-dados` | Tela de medição da PoC de rolagem 3D |

## Documentação

| Doc | Conteúdo |
|---|---|
| [00 — Visão e Escopo](docs/00-visao-e-escopo.md) | Produto, personas, o que entra e o que fica de fora do v1 |
| [01 — Análise dos Protótipos](docs/01-analise-prototipos.md) | O que os três repositórios do cliente realmente contêm |
| [02 — Regras do Sistema](docs/02-regras-do-sistema.md) | **Regras extraídas do código, premissas e lacunas** |
| [03 — Modelo de Dados](docs/03-modelo-de-dados.md) | Entidades, schema, template de ficha, permissões |
| [04 — Arquitetura](docs/04-arquitetura.md) | Stack, monorepo, PWA, tempo real, deploy |
| [05 — Design System](docs/05-design-system.md) | Tokens e linguagem visual extraídos do protótipo |
| [06 — Perguntas para o Cliente](docs/06-perguntas-para-o-cliente.md) | **Lista consolidada de pendências que travam o design** |
| [07 — Roadmap](docs/07-roadmap.md) | Fases de entrega |
| [08 — Rolagem 3D](docs/08-rolagem-3d.md) | **Dados 3D: tecnologia, catálogo, revelação e prova de conceito** |
| [09 — Ficha e Sistema](docs/09-ficha-e-sistema.md) | **A ficha oficial dissecada: perícias, traços, classes, dano, Pandora e catálogo** |
| [ADRs](docs/adr/) | Decisões de arquitetura registradas (0001–0012) |

O PDF oficial da ficha está versionado em
[`docs/fontes/`](docs/fontes/), junto com a extração de texto que sustenta o doc 09.

## Repositórios de referência do cliente

| Repo | Papel |
|---|---|
| [ParadoxoEpifanico](https://github.com/devlopsz/ParadoxoEpifanico) | Landing page React. **Fonte canônica do design.** |
| [ParadoxoEpifanicoD](https://github.com/devlopsz/ParadoxoEpifanicoD) | Fork do anterior. Sem conteúdo exclusivo relevante. |
| [ParadoxoEpifanicoDados](https://github.com/devlopsz/ParadoxoEpifanicoDados) | Rolador de dados. **Única fonte de regras do sistema.** |
