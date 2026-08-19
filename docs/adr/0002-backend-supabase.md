# ADR-0002 — Backend com contas: Supabase

**Data:** 2026-08-19 · **Status:** Aceita

## Contexto
O protótipo guarda tudo em `localStorage`: o histórico morre ao trocar de navegador e o
Mestre não vê nada do que os jogadores fazem. Uma "plataforma única" com ficha e
inventário exige identidade, sincronização entre dispositivos e visão compartilhada.

## Alternativas
1. **Local-first, sync depois** — mais rápido de entregar, mas empurra Mesa e Mestre para o v2, o que esvazia o v1.
2. **Backend próprio** (Node + Postgres) — controle total, ao custo de construir auth, permissões e realtime do zero.
3. **Supabase** — Postgres gerenciado com Auth, Row Level Security e Realtime prontos.

## Decisão
**Supabase.** Postgres + Auth + Realtime + Storage.

## Consequências
- Autorização mora em **RLS**, no banco, não no cliente. É a única forma de "o Mestre vê
  tudo, o jogador vê o dele" ser confiável.
- Realtime sai quase de graça, o que viabiliza o feed de rolagens ([ADR-0009](0009-tempo-real.md)).
- Postgres com JSONB é exatamente o que a ficha schema-driven precisa ([ADR-0005](0005-ficha-schema-driven.md)).
- Cria dependência de fornecedor. Mitigação: é Postgres padrão, migrations versionadas no
  repositório e nenhuma lógica de regra dentro do banco.
- Custo em escala pequena é irrelevante; o plano gratuito atende o playtest.
