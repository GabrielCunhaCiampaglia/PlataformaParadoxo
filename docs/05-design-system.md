# 05 — Design System

Extraído de `ParadoxoEpifanico/src/index.css` e `src/App.jsx`.

> **Diretriz do projeto:** o visual do protótipo do cliente é a referência e deve ser
> preservado. Este documento transforma o CSS existente em um sistema reutilizável, sem
> reinventar a identidade.

---

## 1. Tokens de cor — 🟩 extraídos do protótipo

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#05040a` | Fundo base, quase-preto arroxeado |
| `--bg2` | `#070611` | Fim do gradiente vertical |
| `--ink` | `#ffffff` | Texto principal |
| `--muted` | `rgba(255,255,255,.78)` | Texto secundário |
| `--violet` | `#8d10e0` | **Única cor de marca.** Acentos, foco, destaque |

O fundo do `body` é composto por três camadas, não uma cor chapada:

```css
radial-gradient(1000px 600px at 70% 10%, rgba(138,43,226,.07), transparent 65%),
radial-gradient(800px  600px at 20% 60%, rgba(138,43,226,.04), transparent 70%),
linear-gradient(180deg, #05040a 0%, #070611 100%)
```

### 1.1 Cores que o sistema precisa e o protótipo não tem

O rolador usa cores de resultado que **não estão** no design system da landing:
`gold`, `green`, `lightgreen`, `red` — palavras-chave CSS cruas.

Precisam virar tokens de verdade, calibrados para o fundo escuro e com contraste
verificado (AA em texto grande, no mínimo):

| Token proposto | Semântica |
|---|---|
| `--outcome-extreme` | Extremo! — dourado |
| `--outcome-good` | Sucesso Bom |
| `--outcome-normal` | Sucesso Normal |
| `--outcome-fail` | Falha |
| `--outcome-disaster` | Desastre! |

**Importante:** cor não pode ser o único portador de significado. O grau de sucesso
sempre aparece também como **texto** — como já acontece no protótipo do rolador. Isso
resolve daltonismo de graça.

---

## 2. Tipografia — 🟩 extraída

| Token | Valor |
|---|---|
| `--sans` | `"Helvetica Now Display"`, com fallback `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial` |
| `--mono` | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New"` |

**Helvetica Now Display** é carregada localmente em `.woff2`, nos pesos 400, 500 e 800,
com `font-display: swap`.

> ✅ **Licença confirmada pelo cliente em 19/08/2026.** Helvetica Now Display é uma fonte
> comercial da Monotype, e o cliente confirmou que podemos usá-la. A tipografia do
> protótipo fica **integralmente preservada** — nenhuma substituta é necessária.
>
> Registro operacional: manter os `.woff2` versionados no repositório, servidos do próprio
> domínio, sem CDN de terceiros. Guardar o comprovante de licença junto à documentação do
> projeto, porque a pergunta reaparece a cada auditoria ou troca de fornecedor.

### Padrão de uso
- **Sans** para conteúdo, títulos e números.
- **Mono, caixa alta, `letter-spacing: .12em`, `font-size: 12px`** para toda a camada de
  interface: botões, pílulas, rótulos, HUD. É a assinatura tipográfica do protótipo e o
  que dá o ar de "terminal interceptado".
- Títulos: `font-size: clamp(22px, 3vw, 34px)`, `letter-spacing: -.02em`, `line-height: 1.1`.

---

## 3. Forma e profundidade — 🟩 extraídos

| Token | Valor |
|---|---|
| `--radius` | `18px` (painéis) |
| — | `14px` (botões) |
| — | `999px` (pílulas) |
| `--shadow` | `0 18px 60px rgba(0,0,0,.55)` |

**Superfície padrão (`.panel`)**
```css
border: 1px solid rgba(255,255,255,.14);
border-radius: var(--radius);
background: rgba(10,8,18,.55);
box-shadow: var(--shadow);
```

Bordas são sempre **branco translúcido**, nunca cinza opaco: `.12` a `.18` de alpha. É o
que faz o glassmorphism funcionar.

**Glass:** `backdrop-filter: blur(14px) saturate(1.25)` é o padrão recorrente
(variações de 10px a 20px). Sempre com o prefixo `-webkit-` presente no protótipo.

---

## 4. Componentes já existentes no protótipo

| Componente | Onde | Aproveitamento na plataforma |
|---|---|---|
| `.panel` | `index.css` | **Direto** — é o card da ficha, do item, da rolagem |
| `.btn` | `index.css` | **Direto** |
| `.pill` | `index.css` | **Direto** — tags, filtros, grau de sucesso |
| `.hud` | `index.css` | Adaptar — vira a barra da mesa |
| `.noise` | `index.css` | **Direto** — grain SVG animado, `mix-blend-mode: overlay`, opacidade `.10` |
| `.glitch` | `index.css` | Pontual — reservar para momentos fortes (Desastre!) |
| `ColorBends.jsx` | shader GLSL / three.js | **Só em telas de destaque.** Ver §6 |
| `GradualBlur.jsx` | React | Direto em listas roláveis |
| `Carousel.jsx` | React | Direto |
| Cursor orb, barra de progresso de scroll | `App.jsx` | Só no site, não no app |

---

## 5. Movimento

Do protótipo:
- Transições de interface: `.15s ease` em `transform`, `border-color`, `background`
- Grain: `drift` de 12s, linear, infinito
- Rolador: **2 segundos** embaralhando números antes de revelar o resultado

> **Ponto de atenção de produto:** 2 s por rolagem é uma eternidade numa mesa que rola
> dezenas de vezes por sessão. Proposta: reduzir para **~700–900 ms**, manter a animação
> como padrão e oferecer um botão de pular / preferência de "rolagem rápida".
> `prefers-reduced-motion` desliga a animação e o grain. → **Pergunta D2.**

---

## 6. O que **não** vai inteiro do site para dentro do app

O visual da landing é feito para impressionar em 30 segundos. A ficha é feita para ser
usada por quatro horas num celular. São objetivos diferentes.

| Efeito | Landing | Plataforma |
|---|---|---|
| Shader `ColorBends` (WebGL contínuo) | Sim | **Só em login e tela de mesa.** Nunca atrás da ficha — consome bateria e GPU numa tela que fica horas aberta |
| Grain animado | Sim | Sim, mas estático (sem `drift`) |
| `backdrop-filter` em toda superfície | Sim | Com moderação — é caro em Android intermediário, que é o aparelho real da mesa |
| Glitch | Sim | Só em eventos (Desastre!) |
| Cursor orb | Sim | Não — não existe cursor no celular |

**A identidade se mantém pela cor, tipografia, forma e vazio — não pelos efeitos.**
Essa é a diferença entre manter o visual e sabotar a usabilidade.

---

## 7. Acessibilidade — dívidas a resolver na migração

O protótipo é uma landing e não foi feito com isso em mente. A plataforma precisa:

- Contraste do `--muted` (`rgba(255,255,255,.78)`) sobre `--bg` — verificar em texto pequeno.
- Botões em **mono 12px caixa alta com `letter-spacing`** são bonitos e difíceis de ler.
  Definir um tamanho mínimo maior para os controles da ficha.
- Alvos de toque de no mínimo 44×44 px — crítico, o uso principal é celular na mesa.
- Foco visível em tudo que é interativo.
- `prefers-reduced-motion` respeitado.

---

## 8. Pendências deste documento

| # | Questão | Status |
|---|---|---|
| D1 | A licença da Helvetica Now Display cobre uso como webfont no domínio do produto? | ✅ **Sim** (19/08/2026) |
| D2 | A animação de 2 s da rolagem pode ser reduzida? | Em aberto |
| D3 | Existe manual de marca, paleta oficial ou versões do logo além dos PNGs do repo? | Em aberto |
| D4 | `ParadoxoEpifanicoD` pode ser arquivado? | Em aberto |
