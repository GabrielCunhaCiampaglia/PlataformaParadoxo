# ADR-0007 — React + Vite + TypeScript obrigatório

**Data:** 2026-08-19 · **Status:** Aceita

## Contexto
O protótipo do cliente é React 19 + Vite 7 com `@vitejs/plugin-react-swc`, escrito em
**JSX puro, sem TypeScript**. O design bem elaborado — incluindo um shader GLSL próprio de
294 linhas — está todo nessa base e precisa ser preservado.

## Alternativas
1. **Next.js** — SSR e SEO para a landing e o app na mesma base, rotas de API prontas. Mas exigiria portar o protótipo e complicaria o PWA offline.
2. **React + Vite, mantendo JSX** — migração de custo zero, ao preço de nenhuma segurança de tipo num sistema cheio de schemas dinâmicos.
3. **React + Vite + TypeScript** — mesma base, com conversão do protótipo.

## Decisão
**React 19 + Vite 7 + TypeScript**, SPA. Conversão do protótipo para TS na migração.

## Consequências
- O design do cliente migra praticamente direto: `ColorBends`, `Carousel`, `GradualBlur`,
  o CSS e as fontes.
- TypeScript é especialmente valioso aqui porque o projeto é todo baseado em **estruturas
  dinâmicas** — `sheet_template.definition`, `character.data`, `ruleset.config`. Sem tipos,
  o renderizador de ficha schema-driven ([ADR-0005](0005-ficha-schema-driven.md)) e o motor
  de regras ([ADR-0006](0006-motor-de-regras.md)) viram campo minado.
- Tipos do banco gerados pelo CLI do Supabase mantêm app e schema em sincronia.
- **Custo:** converter ~1.545 linhas de `App.jsx` e três componentes. Trabalho pontual,
  concentrado na Fase 1, não recorrente.
- Sem SSR: a plataforma vive atrás de login e não precisa de SEO. A landing pública
  continua estática, como já é.
