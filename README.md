# Paradoxo Epifânico — Plataforma

Plataforma única para jogar o RPG **Paradoxo Epifânico**, sistema próprio e indie
(ficção apocalíptica, horror / sci-fi / realismo).

> **Estado: documentação. Nenhum código de produto foi escrito ainda.**
> Este repositório está na fase de especificação. O desenvolvimento só começa
> depois que os documentos em `docs/` estiverem aprovados pelo cliente.

## Escopo do v1 — três frentes

| Frente | O que é |
|---|---|
| **Dados** | Rolagem de Ação (d100 vs. Perícia) e Rolagem de Dano (NdX) **em 3D com física real**, com leitura automática de sucesso/falha, histórico persistente e feed em tempo real para a mesa. |
| **Ficha** | Ficha de personagem digital, definida por template versionado, editável e sincronizada entre dispositivos. |
| **Inventário** | Gestão de itens do personagem, com equipar/usar e integração com as rolagens. |

Tudo acontece dentro do conceito de **Mesa** (campanha), com papel de **Mestre**.

Projeto de **uso pessoal e comunitário**, não comercial. Infraestrutura de **custo zero**:
Cloudflare Pages + Supabase Free, em `plataformaparadoxo.pages.dev`
([ADR-0011](docs/adr/0011-deploy-e-infraestrutura.md)).

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
| [ADRs](docs/adr/) | Decisões de arquitetura registradas |

## Repositórios de referência do cliente

| Repo | Papel |
|---|---|
| [ParadoxoEpifanico](https://github.com/devlopsz/ParadoxoEpifanico) | Landing page React. **Fonte canônica do design.** |
| [ParadoxoEpifanicoD](https://github.com/devlopsz/ParadoxoEpifanicoD) | Fork do anterior. Sem conteúdo exclusivo relevante. |
| [ParadoxoEpifanicoDados](https://github.com/devlopsz/ParadoxoEpifanicoDados) | Rolador de dados. **Única fonte de regras do sistema.** |
