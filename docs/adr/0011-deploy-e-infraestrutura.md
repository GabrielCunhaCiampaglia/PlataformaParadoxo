# ADR-0011 — Deploy e infraestrutura de custo zero

**Data:** 2026-08-19 · **Status:** Aceita

## Contexto

Requisito do responsável pelo projeto: **a infraestrutura deve ser a mais gratuita
possível**, incluindo o banco de dados, com um domínio personalizado no formato
`plataformaParadoxo.algumacoisa`.

Natureza do projeto: **uso pessoal e comunitário, não comercial.** O "cliente" é o próprio
autor do sistema; a plataforma serve a ele e à comunidade do RPG, sem cobrança, sem venda e
sem receita. Isso amplia as opções — planos "hobby" que proíbem uso comercial passam a ser
elegíveis.

Escala esperada: dezenas de pessoas, de uma comunidade de Discord. Não há requisito de SLA
nem de alta disponibilidade.

## Alternativas avaliadas

### Hospedagem do front (PWA + landing)

| Opção | Banda no plano grátis | Uso comercial | Veredito |
|---|---|---|---|
| **Cloudflare Pages** | **Sem teto em nenhum plano** | Permitido | **Escolhida** |
| Vercel Hobby | 100 GB/mês | **Proibido** nos termos | Elegível aqui (uso pessoal), mas inferior |
| Netlify Free | ~15 GB efetivos | Permitido | Descartada |
| GitHub Pages | ~100 GB (limite flexível) | Permitido | Plano B |

**Netlify** mudou em **abril de 2026**: saiu dos 100 GB fixos para 300 créditos/mês a 20
créditos por GB, o que dá ~15 GB. Ao estourar, **todos os sites da conta pausam** até o mês
seguinte. Pouco para um app que carrega geometrias 3D, fontes e assets de PWA.

**Vercel** seria legítima neste projeto por ser uso pessoal — a restrição comercial do plano
Hobby não se aplica. Mas foi preterida por **motivo técnico**: a vantagem real da Vercel é
SSR, ISR e edge functions do Next.js, e o [ADR-0007](0007-stack-frontend.md) decidiu SPA sem
SSR, com o Supabase cobrindo o backend. Nada do que ela faz de melhor seria usado, e ainda se
trocaria banda ilimitada por 100 GB.

### Banco de dados

| Opção | Plano grátis | Auth · Realtime · RLS | Problema |
|---|---|---|---|
| **Supabase Free** | 500 MB banco · 50k usuários/mês · 200 conexões realtime · 2M mensagens/mês · 1 GB arquivos | **Prontos** | **Pausa após 7 dias sem requisição, com retomada manual** |
| Neon Free | 0,5 GB · 100 CU-h/mês | Não tem | Cold start de 300–800 ms, mas **retoma sozinho** |
| Cloudflare D1 | SQLite | Não tem | Não é Postgres; auth e realtime do zero |

O Supabase já era a escolha do [ADR-0002](0002-backend-supabase.md), e os limites do plano
grátis são folgados para a escala esperada. O problema é a **pausa automática**.

Trocar por Neon evitaria a pausa, mas custaria construir autenticação, permissões e tempo
real do zero — semanas de trabalho para evitar ~15 linhas de código.

### Domínio

**Domínio próprio gratuito não existe mais.** O Freenom — que oferecia `.tk`, `.ml`, `.ga` e
`.cf` — foi processado pela Meta em 2023 por cybersquatting, parou de registrar
imediatamente e saiu do negócio em 2024. Cerca de 12,6 milhões de domínios saíram do ar.
Ofertas atuais de "domínio grátis" são subdomínios, ou o primeiro ano de uma renovação cara.

| Domínio | Custo/ano |
|---|---|
| **`plataformaparadoxo.pages.dev`** | **R$ 0** |
| `plataformaparadoxo.com.br` | R$ 40 (Registro.br, preço oficial fixo) |
| `plataformaparadoxo.app` | ~R$ 75 |
| `plataformaparadoxo.xyz` | ~R$ 60 |

## Decisão

| Camada | Serviço | Custo |
|---|---|---|
| Front — `apps/web` (PWA) e `apps/site` (landing) | **Cloudflare Pages** | R$ 0 |
| Banco, autenticação, tempo real, arquivos | **Supabase Free** | R$ 0 |
| Keep-alive | **Cloudflare Worker** com Cron Trigger | R$ 0 |
| Domínio | **`plataformaparadoxo.pages.dev`** | R$ 0 |
| **Total** | | **R$ 0/ano** |

### O keep-alive

Um Cloudflare Worker com Cron Trigger — plano grátis, 100 mil requisições/dia — executa uma
consulta trivial ao Supabase **uma vez por dia**. O projeto nunca completa 7 dias ocioso e
nunca pausa.

São ~15 linhas de código e é a peça que torna o plano grátis do Supabase viável em produção.

**Por que isso é essencial e não conveniência:** sendo um grupo pessoal, é provável que a
mesa dê intervalos de duas ou três semanas entre sessões. Sem o keep-alive, voltar de um
intervalo significaria encontrar o app fora do ar, com alguém precisando entrar no painel do
Supabase para religar manualmente.

## Consequências

- **Custo real de R$ 0/ano**, sem cartão de crédito e sem período de teste que expira.
- **Banda sem teto** — o app pode carregar geometrias 3D, fontes e assets sem contar bytes.
- CDN em 300 cidades e proteção DDoS inclusas, o que importa para carregar rápido num celular
  no meio de uma sessão.
- **Sem backups no plano grátis do Supabase.** É a maior lacuna desta decisão. Mitigação:
  incluir um `pg_dump` periódico no mesmo Worker de cron, gravando em Cloudflare R2 ou num
  repositório privado. **Isso precisa entrar na Fase 1** — perder fichas de personagem de uma
  campanha é o pior desfecho possível para uma plataforma de RPG.
- **Sem SLA.** Aceitável: não é serviço comercial e não há compromisso com terceiros.
- **Migração para domínio próprio é trivial** — apontar o DNS no Cloudflare, sem refazer
  build nem configuração. O `.pages.dev` continua funcionando em paralelo.
- O deploy da landing sai do GitHub Pages e passa para o Cloudflare Pages, unificando os dois
  apps num só provedor, a partir do mesmo repositório.

## Condições de revisão

1. **Se a plataforma passar a monetizar.** A landing já tem um botão *"QUERO APOIAR O
   PROJETO"*, para viabilizar o livro e a HQ. Se apoio financeiro, doação ou venda entrarem na
   plataforma, a classificação "não comercial" deixa de valer. A Cloudflare permite uso
   comercial sem ressalva, então **esta decisão não precisaria mudar** — mas Vercel e Netlify
   ficariam definitivamente fora.
2. **Se os 500 MB do Supabase ficarem apertados.** Improvável na escala esperada; fichas e
   histórico de rolagens são dados pequenos. O primeiro sintoma seria a tabela `roll`
   crescendo — resolvível com arquivamento de rolagens antigas antes de pensar em pagar.
3. **Se a comunidade crescer muito além de dezenas de pessoas.** O limite de 200 conexões
   realtime simultâneas seria o primeiro a apertar.
