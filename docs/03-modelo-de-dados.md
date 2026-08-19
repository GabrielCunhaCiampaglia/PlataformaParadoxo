# 03 — Modelo de Dados

Banco: **PostgreSQL via Supabase**. Autenticação por `auth.users` do Supabase.
Autorização por **Row Level Security** — a regra de acesso mora no banco, não no cliente.

> Este documento é a especificação. As migrations só serão escritas depois da aprovação
> das perguntas BLOQUEANTES em [06](06-perguntas-para-o-cliente.md).

---

## 1. Visão geral das entidades

```
auth.users
    └── profile                          perfil público do usuário

ruleset          ─┐                      regras de rolagem, versionadas
sheet_template   ─┤                      formato da ficha, versionado
                  │
game_table  ──────┘                      a Mesa. aponta para 1 ruleset + 1 sheet_template
    ├── table_member                     quem participa e com qual papel
    ├── character                        ficha (data em JSONB)
    │      └── inventory_item            itens do personagem
    └── roll                             histórico de rolagens
```

**Hierarquia central:** `Usuário → Mesa → Personagem`.
Um personagem pertence a exatamente uma mesa. Se o cliente quiser personagens portáteis
entre mesas, isso muda a modelagem → **Pergunta M2**.

---

## 2. Tabelas

### 2.1 `profile`
Extensão de `auth.users`. Criado por trigger no cadastro.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | = `auth.users.id` |
| `display_name` | `text` | Nome exibido nas rolagens |
| `avatar_url` | `text` | |
| `locale` | `text` | `pt-BR` \| `en` \| `ja`. Default `pt-BR` |
| `created_at` | `timestamptz` | |

### 2.2 `ruleset` — as regras, como dado
Torna R1/R2 de [02](02-regras-do-sistema.md) uma mudança de configuração.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | `"Paradoxo Epifânico"` |
| `version` | `int` | Incrementa a cada publicação |
| `config` | `jsonb` | Ver §4 |
| `is_published` | `bool` | |
| `created_at` | `timestamptz` | |

Único índice de unicidade: `(name, version)`.

### 2.3 `sheet_template` — o formato da ficha, como dado

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | |
| `version` | `int` | |
| `definition` | `jsonb` | Ver §5 |
| `is_published` | `bool` | Rascunhos não podem ser usados por mesas |
| `created_at` | `timestamptz` | |

### 2.4 `game_table` — a Mesa

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | |
| `description` | `text` | |
| `owner_id` | `uuid` → `profile` | O Mestre |
| `invite_code` | `text` UNIQUE | Código curto para entrar |
| `ruleset_id` | `uuid` → `ruleset` | Congela a versão de regras da mesa |
| `sheet_template_id` | `uuid` → `sheet_template` | Congela o formato da ficha |
| `archived_at` | `timestamptz` NULL | |
| `created_at` | `timestamptz` | |

**Congelar as versões na mesa é intencional.** Uma campanha em andamento não deve mudar de
regra porque o cliente publicou uma versão nova. A migração é um ato explícito do Mestre.

### 2.5 `table_member`

| Campo | Tipo | Notas |
|---|---|---|
| `table_id` | `uuid` → `game_table` | PK composta |
| `user_id` | `uuid` → `profile` | PK composta |
| `role` | `text` | `gm` \| `player` |
| `joined_at` | `timestamptz` | |

O `owner_id` da mesa tem sempre um `table_member` com `role = 'gm'`.
Mais de um mestre por mesa é permitido pela modelagem. → **Pergunta M3.**

### 2.6 `character` — a ficha

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `table_id` | `uuid` → `game_table` | |
| `owner_id` | `uuid` → `profile` NULL | NULL para NPC do mestre |
| `name` | `text` | |
| `portrait_url` | `text` | |
| `sheet_template_id` | `uuid` → `sheet_template` | Versão com que a ficha foi criada |
| `data` | `jsonb` | **O conteúdo da ficha.** Ver §5.3 |
| `is_npc` | `bool` | Default `false` |
| `visibility` | `text` | `table` \| `gm_only` \| `private` |
| `created_at` / `updated_at` | `timestamptz` | |

`data` é validado contra `definition` do template **na aplicação e no banco**
(constraint `CHECK` com função de validação, ou trigger). Nunca confiar só no cliente.

### 2.7 `inventory_item`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `character_id` | `uuid` → `character` | |
| `name` | `text` | |
| `description` | `text` | |
| `quantity` | `int` | Default 1, `>= 0` |
| `is_equipped` | `bool` | Default `false` |
| `damage_expression` | `text` NULL | Ex.: `2d6`. Permite rolar dano direto do item |
| `attributes` | `jsonb` | Campos extras definidos pelo template de item. Ver §6 |
| `sort_order` | `int` | Ordem manual na lista |

Campos de **peso, capacidade, slots, durabilidade e munição estão ausentes de propósito.**
Cada um deles pressupõe uma regra que o cliente ainda não confirmou. Ver **Pergunta I1–I5**.
Quando confirmados, entram em `attributes` via template — sem migration.

### 2.8 `roll` — histórico

Cumpre a promessa do site: *"personagem, origem, cálculo e resultado"*.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `table_id` | `uuid` → `game_table` | |
| `character_id` | `uuid` → `character` NULL | |
| `user_id` | `uuid` → `profile` | Quem rolou |
| `kind` | `text` | `action` \| `damage` \| `custom` |
| `origin_type` | `text` NULL | `skill` \| `item` \| `manual` |
| `origin_label` | `text` NULL | `"Furtividade"`, `"Faca de Combate"` |
| `expression` | `text` | `"1d100"`, `"3d6"` |
| `dice` | `jsonb` | Valores individuais: `[4, 2, 6]` |
| `total` | `int` | |
| `target_value` | `int` NULL | A Perícia usada, em rolagens de ação |
| `outcome` | `text` NULL | `extreme` \| `good` \| `normal` \| `fail` \| `disaster` |
| `ruleset_id` | `uuid` → `ruleset` | Com qual versão de regra foi interpretada |
| `is_hidden` | `bool` | Rolagem oculta do mestre |
| `created_at` | `timestamptz` | |

Guardar `dice`, `target_value` e `ruleset_id` torna toda rolagem **auditável**: dá para
reconstruir por que aquele resultado foi aquele, mesmo depois de a regra mudar.

Índice: `(table_id, created_at DESC)` — é a consulta do feed.

---

## 3. Row Level Security — resumo das políticas

| Tabela | Leitura | Escrita |
|---|---|---|
| `profile` | Próprio + membros das mesmas mesas | Só o próprio |
| `ruleset`, `sheet_template` | Qualquer autenticado, se `is_published` | Só administrador |
| `game_table` | Membros da mesa | Só o Mestre |
| `table_member` | Membros da mesa | Mestre; jogador pode se remover |
| `character` | Membros, respeitando `visibility`; Mestre vê tudo | Dono da ficha e Mestre |
| `inventory_item` | Herda do `character` | Herda do `character` |
| `roll` | Membros da mesa. Se `is_hidden`, só o autor e o Mestre | Insert pelo autor; **sem update nem delete** |

**Rolagem é imutável.** Não existe editar nem apagar uma rolagem — só isso torna o
histórico confiável na mesa.

---

## 4. Formato de `ruleset.config`

Estrutura proposta, refletindo o que é 🟩 FATO em [02](02-regras-do-sistema.md) e deixando
as pendências explícitas:

Versão **confirmada pelo cliente em 19/08/2026**:

```jsonc
{
  "action": {
    "die": 100,
    "bands": [
      { "id": "extreme",  "label": "Extremo!",       "when": "roll == 1",              "color": "extreme" },
      { "id": "disaster", "label": "Desastre!",      "when": "roll == 100",            "color": "disaster" },
      { "id": "good",     "label": "Sucesso Bom",    "when": "roll <= ceil(skill / 2)", "color": "good" },
      { "id": "normal",   "label": "Sucesso Normal", "when": "roll <= skill",          "color": "normal" },
      { "id": "fail",     "label": "Falha",          "when": "true",                   "color": "fail" }
    ],
    "onMissingSkill": "raw"      // ✅ rolagem livre: exibe o número, sem interpretar
  },
  "damage": {
    "dice": [2, 3, 4, 6, 8, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],  // sem D12 → Pergunta C1
    "allowModifier": false,      // → Pergunta C2
    "allowMixedDice": false      // → Pergunta C5
  }
}
```

Notas sobre o formato:

- `bands` é uma lista **ordenada** — a primeira condição verdadeira vence, exatamente como o
  `if/else` original. Adicionar Falha Crítica (R4) ou um quarto grau de sucesso (R5) é
  **inserir um item nesta lista**.
- `ceil` faz parte da gramática fechada do interpretador ([ADR-0006](adr/0006-motor-de-regras.md)),
  junto com `floor`, `round`, `min` e `max`.
- Os campos `comparison` e `rounding` que existiam na proposta anterior **foram removidos**:
  a decisão está expressa diretamente na condição de cada faixa, o que é mais legível e
  evita dois lugares para a mesma regra.
- `onMissingSkill: "raw"` significa que a rolagem sem Perícia grava `target_value` e
  `outcome` nulos, e a interface mostra apenas o número.

`bands` é uma lista **ordenada** — a primeira que casar vence, exatamente como no código
original. Adicionar uma Falha Crítica (R4) ou um quarto grau de sucesso (R5) é inserir um
item nessa lista, não mexer em código.

> As expressões em `when` são avaliadas por um interpretador **restrito e próprio**, com
> gramática fechada (números, `roll`, `skill`, operadores aritméticos e de comparação).
> Nunca `eval`, nunca `Function`. Ver [ADR-0006](adr/0006-motor-de-regras.md).

---

## 5. Formato de `sheet_template.definition`

### 5.1 Estrutura

```jsonc
{
  "version": 1,
  "sections": [
    {
      "id": "identidade",
      "label": "Identidade",
      "fields": [
        { "id": "conceito", "label": "Conceito", "type": "text" },
        { "id": "notas",    "label": "Anotações", "type": "longtext" }
      ]
    },
    {
      "id": "recursos",
      "label": "Recursos",
      "fields": [
        { "id": "vida", "label": "Vida", "type": "resource", "max": 100 }
      ]
    },
    {
      "id": "pericias",
      "label": "Perícias",
      "type": "list",
      "itemType": "skill",
      "rollable": true
    }
  ]
}
```

### 5.2 Tipos de campo

| Tipo | Guarda | Notas |
|---|---|---|
| `text` / `longtext` | `string` | |
| `number` | `number` | Com `min` / `max` opcionais |
| `skill` | `number` 0–100 | **Rolável.** Clicar dispara a Rolagem de Ação usando este valor |
| `resource` | `{ current, max }` | Vida, sanidade, munição |
| `boolean` | `bool` | |
| `select` | `string` | Com `options[]` |
| `list` | `array` | Lista dinâmica de subcampos |
| `derived` | calculado | Fórmula na mesma gramática restrita do `ruleset` |

O tipo **`skill`** é a única ponte confirmada entre ficha e regra: é o valor que o d100
enfrenta. Todo o resto da ficha é, hoje, descritivo.

### 5.3 `character.data`

Objeto plano chaveado pelos `id`s do template:

```jsonc
{
  "conceito": "Ex-paramédica da Organização Resiliência",
  "vida": { "current": 8, "max": 12 },
  "pericias": [
    { "id": "furtividade", "label": "Furtividade", "value": 45 },
    { "id": "primeiros_socorros", "label": "Primeiros Socorros", "value": 70 }
  ]
}
```

### 5.4 Versionamento

- Publicar uma nova versão de template **cria uma linha nova**, nunca edita a existente.
- Fichas continuam apontando para a versão com que foram criadas.
- Migrar uma mesa para um template novo é ação explícita do Mestre, com preview do que
  muda e o que se perde.
- Campo removido do template: o valor **permanece** em `data` (não destruímos dado do
  jogador), apenas deixa de ser exibido.

### 5.5 Template v1 — vazio, por decisão do cliente

Em 19/08/2026 o cliente pediu para deixar a ficha **em aberto**; ele enviará a definição
depois. Portanto:

```jsonc
{ "version": 1, "sections": [] }
```

O template v1 é publicado **vazio**. Não inventamos seções, campos nem perícias por
analogia com outros sistemas percentuais.

Quando a definição chegar, ela vira o template v2 — **uma linha nova na tabela**, sem
migration, sem redeploy e sem tocar no renderizador. É precisamente o cenário para o qual
o [ADR-0005](adr/0005-ficha-schema-driven.md) foi escrito.

**O que isso não trava:** a frente de Dados. A rolagem livre não precisa de ficha, e a
rolagem com Perícia precisa apenas de um número entre 1 e 100 — que pode ser digitado
enquanto a ficha não existe, exatamente como o rolador atual já faz.

---

## 6. Template de item

Mesmo mecanismo do `sheet_template`, aplicado a `inventory_item.attributes`.
Fica vazio no v1 e ganha campos (peso, durabilidade, munição, tipo de dano) conforme o
cliente confirmar as regras correspondentes.

---

## 7. Pendências deste documento

| # | Questão |
|---|---|
| M1 | Um usuário pode ter mais de um personagem na mesma mesa? |
| M2 | Personagem é preso à mesa, ou portátil entre mesas? |
| M3 | Uma mesa pode ter mais de um Mestre (co-mestre)? |
| M4 | O Mestre pode editar a ficha do jogador, ou só visualizar? |
| M5 | Ficha de NPC / Kiev entra no v1 ou fica para o v1.1? |
| H1 | "Origem" da rolagem significa mesmo *o que disparou a rolagem*? |
