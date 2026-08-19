# ADR-0006 — Motor de regras isolado, dirigido por configuração

**Data:** 2026-08-19 · **Status:** Aceita

## Contexto
As regras de rolagem existem hoje como `if/else` dentro de um handler de clique, misturado
com manipulação de DOM e com um `setTimeout` de animação
(`ParadoxoEpifanicoDados/index.html:242`).

Duas regras concretas já estão **sob suspeita e pendentes de confirmação**: a comparação
`<` versus `<=` (R1) e o arredondamento de `Perícia / 2` (R2). Outras vão mudar.

## Decisão
1. `packages/rules` é **puro**: não importa React, não faz rede, não conhece Supabase.
   Assinatura conceitual: `(ruleset, entrada, fonte de aleatoriedade) → resultado`.
2. A tabela de resultados é **dado**, não código: `ruleset.config.action.bands`, uma lista
   ordenada onde a primeira condição verdadeira vence — a mesma semântica do `if/else`
   original.
3. `ruleset` é **versionado**, e cada `roll` grava com qual versão foi interpretado.
4. As expressões (`roll < skill / 2`, campos `derived`) são avaliadas por um
   **interpretador próprio de gramática fechada** — números, `roll`, `skill`, aritmética e
   comparação. **Nunca `eval`, nunca `new Function`, nem via `mathjs`.**

## Consequências
- Responder R1 ou R2 vira **mudança de configuração**, não de código.
- Adicionar Falha Crítica (R4) ou um novo grau de sucesso (R5) é inserir um item na lista.
- O motor é testável exaustivamente sem UI, com aleatoriedade semeada.
- Toda rolagem é **auditável**: guardamos os dados individuais, a perícia alvo e a versão
  da regra, então dá para reconstruir qualquer resultado histórico.
- Se as rolagens precisarem ser validadas no servidor (pergunta A1), o mesmo pacote roda
  numa Edge Function sem alteração.
- **Custo:** escrever e testar um interpretador de expressão, mesmo pequeno. É trabalho
  real, mas é a alternativa segura ao `eval` — e `mathjs` já está no `package.json` do
  protótipo sem uso, o que sugere que essa tentação já apareceu antes.
