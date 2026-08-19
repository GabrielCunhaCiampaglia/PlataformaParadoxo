# ADR-0005 — Ficha schema-driven, com template versionado

**Data:** 2026-08-19 · **Status:** Aceita

## Contexto
Esta é a decisão mais importante do projeto, e ela nasce de um fato desconfortável:
**o sistema de RPG do cliente não está documentado em lugar nenhum.** Os três repositórios
não contêm um único campo de ficha, atributo, perícia nomeada ou item.

O único mecanismo confirmado é: existe um valor numérico chamado "Perícia" que é comparado
contra um d100.

Além disso, o sistema é **indie e vivo** — vai mudar durante e depois do desenvolvimento.

## Alternativas
1. **Schema rígido em tabelas** — colunas fixas para atributos, perícias e status. Consulta e validação simples, mas cada mudança de regra vira migration + deploy. Com o sistema indefinido, garante retrabalho.
2. **Híbrido** — núcleo fixo + JSONB para o resto. Herda o pior dos dois se o núcleo estiver errado, e não temos como saber se está.
3. **Schema-driven** — a definição da ficha é **dado versionado**, não código.

## Decisão
**Schema-driven.** O formato da ficha vive em `sheet_template.definition` (JSONB,
versionado). O conteúdo da ficha vive em `character.data` (JSONB), validado contra o
template no cliente **e no servidor**.

Publicar uma versão nova de template **cria uma linha nova**; fichas existentes continuam
apontando para a versão com que foram criadas. Migrar é ato explícito do Mestre.

## Consequências
- **O desenvolvimento não fica bloqueado esperando o sistema ficar pronto.** Começamos com
  um template mínimo — identidade + lista de Perícias — que é tudo que é fato hoje.
- O cliente ajusta a ficha **sem redeploy**.
- Campanhas em andamento não quebram quando o sistema evolui.
- **Custo:** perde-se validação por tipo do banco, consultas por campo de ficha ficam mais
  chatas, e é preciso construir um renderizador de ficha dirigido por schema — que é
  substancialmente mais trabalho do que um formulário estático.
- Exige um tipo de campo `skill` de primeira classe: é a única ponte confirmada entre a
  ficha e a regra do d100.
- Abre caminho para o painel de administração de regras (pergunta A3), mas ele não é v1.
