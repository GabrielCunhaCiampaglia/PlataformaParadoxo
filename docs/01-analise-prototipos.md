# 01 — Análise dos Protótipos do Cliente

Análise feita sobre o estado dos três repositórios em **19/08/2026**.

---

## 1. Panorama

| Repositório | Stack | Tamanho útil | Papel real |
|---|---|---|---|
| `ParadoxoEpifanicoDados` | HTML/CSS/JS puro, arquivo único | 347 linhas (280 KB, dos quais ~268 KB são um logo em base64) | Rolador de dados. **Única fonte de regras.** |
| `ParadoxoEpifanico` | React 19 + Vite 7 | ~1.545 linhas em `App.jsx` + ~1.000 de CSS | Landing page institucional. **Fonte do design.** |
| `ParadoxoEpifanicoD` | idem | idem | **Fork.** Ver §4. |

---

## 2. `ParadoxoEpifanicoDados` — o rolador

Arquivo único `index.html`. Sem build, sem dependências, sem backend.
Todo o estado vive em `localStorage`.

### Estrutura da interface
- Duas abas: **Ação** e **Dano +**
- Aba Ação: campo `Nome do Jogador` (texto livre) + campo `Valor` (perícia, numérico) + botão Rolar
- Aba Dano: campo `Nome do Jogador` + `<select>` de dado + `Qtd. Dados` + botão Rolar
- Bloco **Histórico** compartilhado pelas duas abas, com botão Limpar
- Animação de 2 s embaralhando números antes de revelar o resultado

### Lógica
Ver [02 — Regras do Sistema](02-regras-do-sistema.md). É o coração do que existe.

### Limitações técnicas observadas
- Histórico é um array de **strings formatadas**, não de objetos. Ex.: `"Gabriel: 47"`.
  Não há timestamp, tipo de rolagem, perícia usada, personagem ou mesa.
- O histórico cresce indefinidamente, sem limite nem paginação.
- Não distingue rolagem de Ação de rolagem de Dano no histórico.
- `parseInt` sem validação: perícia vazia vira `NaN` e toda comparação retorna `false`.
- `Math.random()` direto, sem semente nem auditabilidade.
- O logo está embutido como base64 gigante dentro do HTML, o que sozinho responde por
  ~96% do peso do arquivo.

---

## 3. `ParadoxoEpifanico` — a landing page

React 19.2 + Vite 7.3 + `@vitejs/plugin-react-swc`. JSX puro, **sem TypeScript**.
Publicado via `gh-pages` em `https://devlopsz.github.io/ParadoxoEpifanico/`.

### Dependências relevantes
| Pacote | Uso |
|---|---|
| `three` ^0.182 | Shader GLSL de fundo (`ColorBends.jsx`) |
| `motion` ^12.34 | Animações |
| `mathjs` ^15.1 | Presente no `package.json`; **nenhum uso encontrado no código**. Possivelmente resquício de um experimento de parser de expressão de dados. |
| `gh-pages` ^6.3 | Deploy |

### Seções da página
`#inicio` → `#universo` → `#experiencias` → `#downloads` → `#comunidade` → `#contato` → encerramento.

### Componentes próprios
| Arquivo | Linhas | O que faz |
|---|---|---|
| `ColorBends.jsx` | 294 | Plano full-screen com fragment shader GLSL próprio: gradiente animado, warp por ruído, parallax e influência do ponteiro. Até 8 cores. |
| `Carousel.jsx` | 293 | Carrossel custom com arraste |
| `GradualBlur.jsx` | 253 | Desfoque progressivo nas bordas de uma área |

### i18n
Objeto `I18N` em `App.jsx` com **PT-BR como chave** e traduções para `en` e `ja`.
Padrão: `{ "Texto em português": { en: "...", ja: "..." } }`.
Frágil — qualquer ajuste de copy em português quebra a tradução silenciosamente.
Ver decisão em [ADR-0008](adr/0008-i18n.md).

### Sinais de roadmap embutidos no próprio site
O array `DL_ITEMS` (`App.jsx:186`) descreve o app oficial e **já promete mais do que o
rolador entrega hoje**:

1. Rolagem de Dados — "com base no sistema PE"
2. Automatização — "cálculo automático... leitura integrada para tipos de sucessos e falhas"
3. Prateleira de Dados — "D2 até o D100"
4. Histórico — *"com informações do **personagem**, **origem**, cálculo e resultado"*
5. **Fichas** — *"Tenha acesso à sua Ficha enquanto joga, facilitando a consulta de valores e alterações"*

Os itens 4 e 5 **não existem** no rolador atual. Confirmam que ficha e histórico
estruturado já estavam no plano do cliente.

O site também anuncia **download para Windows e Android** e "Versão mais recente
disponível" — promessas que a plataforma precisa cumprir. Ver [ADR-0004](adr/0004-pwa.md).

### Lore relevante para as regras
Da seção Universo:
> Em 2026, uma colisão misteriosa no Ártico trouxe o fim da civilização e o surgimento dos
> **Kiev**, monstruosidades grotescas que caçam o que restou da humanidade. [...] o mundo
> fragmentou-se em territórios brutais regidos pela lei do mais forte e por um **sistema de
> Ranking de combate**. A última esperança reside na **Organização Resiliência** [...]

Três termos com potencial impacto mecânico e **nenhuma definição no código**:
**Kiev** (bestiário), **Ranking de combate** (progressão? poder?), **Organização
Resiliência** (facção). Ver [06 — Perguntas](06-perguntas-para-o-cliente.md).

---

## 4. `ParadoxoEpifanicoD` — o fork

Diff completo contra `ParadoxoEpifanico`, ignorando `.git` e `package-lock.json`:

- `ParadoxoEpifanicoD` **não tem** `.gitignore`
- `package.json` difere
- `vite.config.js` difere

**Todo o restante — `App.jsx`, `index.css`, componentes, fontes, imagens — é byte a byte idêntico.**

### Conclusão
Não é um protótipo alternativo nem uma segunda ideia de design. É a mesma landing page,
provavelmente uma cópia para testar deploy ou uma branch que virou repositório.

**Recomendação:** tratar `ParadoxoEpifanico` como canônico (é o que tem `homepage`
configurado e `.gitignore`) e confirmar com o cliente se `ParadoxoEpifanicoD` pode ser
arquivado. Manter dois repos idênticos garante divergência futura.

---

## 5. O que os protótipos **não** contêm

Vale registrar explicitamente, porque define o tamanho real do trabalho de especificação:

- Nenhum campo de ficha de personagem
- Nenhum atributo, característica ou lista de perícias
- Nenhum conceito de vida, sanidade, estresse, energia ou qualquer recurso
- Nenhum item, arma, equipamento ou regra de inventário/carga
- Nenhuma regra de combate, iniciativa, turno ou teste oposto
- Nenhum modificador, bônus, penalidade, vantagem ou desvantagem
- Nenhuma progressão, XP, nível ou o "Ranking" citado na lore
- Nenhum bestiário / stats de Kiev
- Nenhuma autenticação, conta, mesa ou multiplayer

O sistema do cliente **existe fora do código** — em anotações, na cabeça dele ou num
documento que ainda não recebemos. A [lista de perguntas](06-perguntas-para-o-cliente.md)
é o instrumento para trazê-lo para dentro.
