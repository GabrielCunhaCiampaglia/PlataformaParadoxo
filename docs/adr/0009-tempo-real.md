# ADR-0009 — Feed de rolagens em tempo real

**Data:** 2026-08-19 · **Status:** Aceita

## Contexto
No rolador atual, a rolagem acontece no aparelho do jogador e o resultado é comunicado
falando em voz alta ou digitando no Discord. O Mestre não tem como acompanhar nem
verificar nada.

## Alternativas
1. **Histórico por atualização de página** — grava no banco e aparece no refresh. Barato, mas na prática ninguém fica atualizando: o pessoal continua anunciando o resultado no Discord, e a plataforma não muda nada.
2. **Feed em tempo real** — a rolagem de um jogador aparece na hora para todos.

## Decisão
**Feed em tempo real**, via Supabase Realtime (Postgres Changes na tabela `roll`, filtrado
por `table_id`), mais Presence para mostrar quem está na mesa.

Inclui **rolagem oculta do Mestre** (`roll.is_hidden`).

## Consequências
- É o maior ganho percebido sobre o rolador atual, e vem com esforço baixo dado que o
  Supabase já foi escolhido ([ADR-0002](0002-backend-supabase.md)).
- Rolagens ocultas são filtradas pela **RLS**, no servidor: o cliente do jogador nunca
  recebe o evento. Esconder na interface não seria segredo de verdade.
- Rolagem é **append-only** — sem update nem delete. É o que torna o histórico confiável
  para a mesa.
- Sem conexão, o feed degrada para o histórico em cache e as rolagens entram numa fila
  local até sincronizar.
- Custo de conexões simultâneas é irrelevante na escala de mesas de RPG.
