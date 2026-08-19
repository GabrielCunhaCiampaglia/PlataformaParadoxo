# Architecture Decision Records

Decisões tomadas na fase de documentação, com o contexto que as motivou e o que elas
custam. Uma ADR não se edita depois de aceita — se a decisão mudar, escreve-se uma nova
que a substitui.

| # | Decisão | Status |
|---|---|---|
| [0001](0001-escopo-v1.md) | Escopo do v1: Dados, Ficha e Inventário dentro de Mesa com Mestre | Aceita |
| [0002](0002-backend-supabase.md) | Backend com contas: Supabase | Aceita |
| [0003](0003-monorepo.md) | Monorepo novo | Aceita |
| [0004](0004-pwa.md) | Distribuição como PWA instalável | Aceita |
| [0005](0005-ficha-schema-driven.md) | **Ficha schema-driven, com template versionado** | Aceita |
| [0006](0006-motor-de-regras.md) | Motor de regras isolado, dirigido por configuração | Aceita |
| [0007](0007-stack-frontend.md) | React + Vite + TypeScript obrigatório | Aceita |
| [0008](0008-i18n.md) | i18n com chaves estáveis | Aceita |
| [0009](0009-tempo-real.md) | Feed de rolagens em tempo real | Aceita |
| [0010](0010-rolagem-3d.md) | Rolagem 3D: three.js + cannon-es, com rotulagem pós-simulação | Aceita, condicionada à PoC |
| [0011](0011-deploy-e-infraestrutura.md) | Deploy e infraestrutura de custo zero | Aceita |

**0005 e 0006 são as decisões estruturantes.** Ambas nascem do mesmo fato: o sistema de
RPG ainda não está documentado e vai mudar. As duas transformam "regra" e "formato de
ficha" em **dado versionado** em vez de código, para que a evolução do sistema do cliente
não exija deploy nem quebre campanhas em andamento.
