# 04 — Arquitetura

## 1. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Front-end | **React 19 + Vite 7 + TypeScript** | Mesma base do protótipo do cliente; TS obrigatório pelo peso do motor de regras e do schema de ficha ([ADR-0007](adr/0007-stack-frontend.md)) |
| Distribuição | **PWA instalável** | Cumpre a promessa de "Windows e Android" do site com uma base só ([ADR-0004](adr/0004-pwa.md)) |
| Backend | **Supabase** — Postgres + Auth + Realtime + Storage | Auth, RLS e realtime prontos; sem servidor próprio para manter ([ADR-0002](adr/0002-backend-supabase.md)) |
| Estado servidor | TanStack Query | Cache, revalidação, offline |
| Roteamento | React Router | |
| Validação | Zod | Schema do template e do `character.data` compartilhado entre app e Edge Functions |
| Rolagem 3D | three.js (já no protótipo) + `cannon-es` | Física real com delta de ~155 KB gz e contexto WebGL único ([ADR-0010](adr/0010-rolagem-3d.md)) |
| Testes | Vitest (unidade) + Playwright (e2e) | O motor de regras é 100% testável sem UI |

Sem SSR. A plataforma vive atrás de login e não precisa de SEO — a landing pública é que
precisa, e ela continua sendo um app separado.

## 2. Estrutura do monorepo

```
ParadoxoEpifanico/
├── docs/                       ← especificação (esta fase)
├── packages/
│   ├── design-system/          tokens + primitivos de UI extraídos do protótipo
│   ├── rules/                  MOTOR DE REGRAS — puro, sem React, sem rede
│   ├── dice-3d/                ROLAGEM 3D — three.js + cannon-es, atrás de roll()
│   ├── sheet-schema/           tipos + validação do sheet_template e do character.data
│   └── supabase/               tipos gerados do banco + cliente configurado
├── apps/
│   ├── web/                    A PLATAFORMA (PWA)
│   └── site/                   landing page — migração do protótipo do cliente
└── supabase/
    ├── migrations/
    └── functions/
```

Gerenciador: **pnpm workspaces**. Sem Turborepo/Nx no início — o overhead não se paga em
dois apps.

### Por que `rules` é um pacote separado
O motor de regras não importa React, não faz rede e não conhece Supabase. Recebe
`(ruleset, entrada, fonte de aleatoriedade)` e devolve um resultado. Isso permite testá-lo
exaustivamente, reusá-lo numa Edge Function se as rolagens precisarem ser validadas no
servidor, e trocar a fonte de aleatoriedade por uma semente fixa nos testes.

### Por que a landing entra no monorepo
Hoje ela é o único lugar onde o design existe. Trazê-la para dentro e fazê-la consumir
`packages/design-system` garante que o site e a plataforma **não divirjam visualmente** —
que é exatamente o pedido de manter o visual do protótipo.

## 3. Fluxo de uma rolagem

```
Jogador toca na Perícia "Furtividade" (45) na ficha
        │
        ▼
apps/web monta a entrada { kind: 'action', skill: 45, origin: {...} }
        │
        ▼
packages/rules  →  rola 1d100, aplica ruleset.config.action.bands
        │           devolve { roll: 23, outcome: 'normal', band: {...} }
        ▼
INSERT em roll  (dice, total, target_value, outcome, ruleset_id)
        │
        ▼
Supabase Realtime  →  feed da mesa atualiza para todos os membros
```

### Onde a aleatoriedade acontece
No cliente, no v1. É o mesmo nível de confiança de um dado físico numa mesa presencial:
funciona porque as pessoas se conhecem. Se o cliente quiser rolagem à prova de trapaça
(mesa aberta com desconhecidos), a rolagem migra para uma Edge Function — e é por isso que
`packages/rules` não depende de React. → **Pergunta A1.**

## 4. Tempo real

`supabase.channel('table:<id>')` com Postgres Changes na tabela `roll` filtrado por
`table_id`. Rolagens ocultas (`is_hidden`) são filtradas pela RLS — o cliente do jogador
**não recebe** o evento, em vez de recebê-lo e esconder na interface.

Presença (quem está online na mesa) via Supabase Presence — barato e de bom efeito.

## 5. Offline

A mesa acontece em porão, sítio, lugar com Wi-Fi ruim. Offline não é luxo.

| Cenário | Comportamento |
|---|---|
| Ler a ficha offline | Funciona — cache do TanStack Query em IndexedDB |
| Rolar offline | Funciona — o motor é local; a rolagem entra numa fila |
| Editar a ficha offline | Funciona — edição local, sincroniza depois |
| Feed em tempo real | Degrada para o histórico em cache |
| Conflito de edição | Last-write-wins por campo, com aviso. → **Pergunta A2** |

## 6. Segurança

- **Toda** autorização em RLS. O cliente nunca é a fonte da verdade sobre permissão.
- `character.data` validado no servidor contra o template — um cliente adulterado não
  grava lixo na ficha.
- Expressões de `ruleset` e campos `derived` avaliadas por um **parser próprio de gramática
  fechada**. Nunca `eval`, nunca `new Function`, nem via `mathjs` (que o protótipo lista
  como dependência sem usar).
- Rolagens são append-only, sem update nem delete.
- Código de convite: aleatório, curto, revogável e regenerável pelo Mestre.

## 7. Deploy — custo zero

Decisão e comparativo completo em [ADR-0011](adr/0011-deploy-e-infraestrutura.md).

| O quê | Onde | Custo |
|---|---|---|
| `apps/web` (PWA) e `apps/site` (landing) | **Cloudflare Pages** — banda sem teto, SSL e CDN em 300 cidades | R$ 0 |
| Banco, autenticação, tempo real, arquivos | **Supabase Free** | R$ 0 |
| Keep-alive e backup | **Cloudflare Worker** com Cron Trigger | R$ 0 |
| Domínio | **`plataformaparadoxo.pages.dev`** | R$ 0 |

Ambientes: `dev` local → `staging` (Supabase de teste) → `prod`.

### 7.1 O Worker de cron — duas funções

O plano grátis do Supabase **pausa o projeto após 7 dias sem nenhuma requisição**, e a
retomada é **manual**, pelo painel. Um Cloudflare Worker com Cron Trigger resolve isso e
aproveita a mesma execução para cobrir a segunda lacuna do plano grátis:

1. **Keep-alive diário** — uma consulta trivial ao Supabase. O projeto nunca completa 7 dias
   ocioso. ~15 linhas.
2. **Backup periódico** — `pg_dump` gravado em Cloudflare R2 ou repositório privado. **O plano
   grátis do Supabase não tem backup nenhum**, e perder as fichas de uma campanha em andamento
   é o pior desfecho possível desta plataforma. Entra na Fase 1, não depois.

### 7.2 Migração da landing

O `apps/site` sai do GitHub Pages e passa para o Cloudflare Pages, unificando os dois apps num
provedor só, a partir do mesmo repositório. O fluxo `gh-pages` do protótipo é descartado.

### 7.3 Por que não Vercel

O projeto é de **uso pessoal e não comercial**, então a proibição de uso comercial do plano
Hobby da Vercel **não se aplica** — ela seria elegível. Foi preterida por motivo técnico: sua
vantagem real é SSR, ISR e edge functions do Next.js, e o [ADR-0007](adr/0007-stack-frontend.md)
decidiu SPA sem SSR, com o Supabase cobrindo o backend. Nada disso seria usado, e ainda se
trocaria banda ilimitada por 100 GB/mês.

## 8. Pendências deste documento

| # | Questão |
|---|---|
| A1 | A rolagem precisa ser à prova de trapaça (validada no servidor)? |
| A2 | Conflito de edição simultânea da mesma ficha — last-write-wins basta? |
| A3 | Quem administra `ruleset` e `sheet_template`? Precisa de painel para o cliente, ou nós publicamos as versões? |
