# ADR-0001 — Escopo do v1: Dados, Ficha e Inventário dentro de Mesa com Mestre

**Data:** 2026-08-19 · **Status:** Aceita

## Contexto
O cliente pediu "uma plataforma única para jogar seu RPG". Os protótipos entregam apenas
um rolador de dados e uma landing page. "Plataforma única" comporta desde um rolador
melhorado até um VTT completo com mapa e tokens.

## Decisão
O v1 tem **três frentes**: Dados, Ficha e Inventário — costuradas pelo conceito de
**Mesa** com papel de **Mestre**, na hierarquia `Usuário → Mesa → Personagem`.

Ficam **fora**: mapa tático, grid, tokens, fog of war, chat de texto/voz, bestiário,
compêndio de lore, pagamentos e publicação em lojas.

## Consequências
- A mesa continua acontecendo no Discord; a plataforma é a ficha, os dados e o inventário.
- Sem Mesa/Mestre as três frentes seriam ferramentas soltas — a Mesa é o que as une, e
  por isso ela é v1 e não v2.
- Ficha e inventário **não existem nos protótipos**, o que joga o peso do projeto para a
  fase de especificação, não de implementação.
- O bestiário de Kiev é o candidato mais forte a v1.1 e está registrado como tal.
