# ADR-0003 — Monorepo novo

**Data:** 2026-08-19 · **Status:** Aceita

## Contexto
Existem três repositórios do cliente. Dois são idênticos entre si (landing page) e o
terceiro é um arquivo HTML solto. A plataforma precisa compartilhar identidade visual com
a landing e reaproveitar as regras em mais de um lugar.

## Alternativas
1. **Repositórios separados** — simples de gerir, mas o design system vira cópia manual e diverge em semanas.
2. **Evoluir o repositório existente** — aproveita tudo, mas mistura site institucional com produto e complica o deploy.
3. **Monorepo novo** — um repositório com `packages/` e `apps/`.

## Decisão
**Monorepo novo** em `C:\ProjetosClaude\ParadoxoEpifanico`, com **pnpm workspaces**.

```
docs/  packages/{design-system,rules,sheet-schema,supabase}  apps/{web,site}  supabase/
```

A landing do cliente é **migrada para dentro** como `apps/site` e passa a consumir
`packages/design-system`.

## Consequências
- Site e plataforma compartilham tokens de verdade — o pedido de "manter o visual do
  protótipo" deixa de depender de disciplina e passa a ser estrutural.
- `packages/rules` é reutilizável pelo app e por uma Edge Function, se as rolagens
  precisarem ser validadas no servidor.
- Sem Turborepo/Nx no início: o overhead não se paga com dois apps. Reavaliar se o build
  passar de ~1 minuto.
- Os repositórios do cliente viram referência histórica. `ParadoxoEpifanicoD` deve ser
  arquivado (pergunta D4).
