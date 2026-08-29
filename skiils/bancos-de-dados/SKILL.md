---
name: bancos-de-dados
description: "Modelos de bancos de dados (SQL, NoSQL, NewSQL), sharding, replicação, locks, transações, isolation levels, event sourcing, CDC, CQRS, indexação e otimização de queries."
---

# Bancos de Dados

Cobre a teoria e prática de bancos de dados: modelos (SQL, NoSQL, NewSQL), estratégias de sharding e escalabilidade, locks e controle de concorrência, padrões arquiteturais (Event Sourcing, CDC, CQRS) e SQL essencial.

## Quando usar

- Escolhendo entre SQL, NoSQL ou NewSQL para um projeto
- Projetando estratégia de sharding ou escalabilidade de dados
- Depurando problemas de locks, deadlocks ou concorrência
- Implementando Event Sourcing, CDC ou CQRS
- Otimizando queries e entendendo índices
- Investigando níveis de isolamento de transações

## Fluxo

1. Identifique a preocupação: modelo de dados, escalabilidade, concorrência ou padrão arquitetural
2. Carregue a referência relevante em `references/` para detalhamento profundo
3. Bancos de dados são interconectados: sharding afeta locks, CDC afeta consistência, índices afetam performance

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [modelos-de-db.md](references/modelos-de-db.md) | SQL relacional, 6 tipos NoSQL, NewSQL/PostgreSQL, quando usar cada |
| [sharding.md](references/sharding.md) | 4 algoritmos, consistent hashing, rebalanceamento, hot partition |
| [escalabilidade.md](references/escalabilidade.md) | Índices, replicação, materialized views, denormalização, connection pooling |
| [locks-e-transacoes.md](references/locks-e-transacoes.md) | Tipos de lock, isolation levels, deadlock, pessimistic vs optimistic |
| [event-sourcing-cdc.md](references/event-sourcing-cdc.md) | Event Sourcing, CDC, CQRS, padrões de projeção, casos reais |
| [sql-essencial.md](references/sql-essencial.md) | DDL/DQL/DML/DCL/TCL, indexação, query optimization, boas práticas |`n| [postgresql-profundo.md](references/postgresql-profundo.md) | EXPLAIN ANALYZE, VACUUM, BRIN/GIN/GiST, particionamento, CTEs, locking |
