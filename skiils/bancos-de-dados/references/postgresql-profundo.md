# PostgreSQL Profundo — Referencia Detalhada

## 1. EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42 AND status = 'submitted';
-- Seq Scan on orders  (cost=0.00..12500.00 rows=500 width=240) (actual time=15.432..120.123 rows=3 loops=1)
--   Filter: ((status = 'submitted') AND (user_id = 42))
-- Planning Time: 0.123 ms
-- Execution Time: 120.456 ms
```

**O que olhar:** tipo de scan (Seq Scan = ruim, Index Scan = bom, Bitmap Index Scan = medio). Rows estimado vs actual (se muito diferente = estatisticas desatualizadas, rodar ANALYZE). Execution time.

## 2. Tipos de Scan

**Seq Scan:** le tabela inteira. Ruim para tabelas grandes com WHERE seletivo.
**Index Scan:** le indice + tabela. Bom para poucas linhas.
**Index Only Scan:** le SO indice (tem todos dados). Perfeito. Precisa de covering index + visibilidade.
**Bitmap Index Scan:** combina multiplos indices. Bom para AND/OR de colunas indexadas.

## 3. Indices Avancados

**B-tree (padrao):** 90% dos casos. WHERE =, >, <, BETWEEN, ORDER BY.
**Hash:** so igualdade (=). Menor que B-tree. Raramente usado (B-tree quase igual).
**GIN (Generalized Inverted):** full-text search (tsvector), arrays (@>, &&), JSONB (?).
**GiST (Generalized Search Tree):** geoespacial (PostGIS), full-text (alternativa), ranges.
**BRIN (Block Range IN):** tabelas ENORMES com ordem natural (time-series). MUITO menor que B-tree.
**SP-GiST:** particionamento espacial. kNN, pontos geo.

### Quando Usar Cada
- `WHERE column = 'value'` -> B-tree
- `WHERE tags @> ARRAY['urgent']` -> GIN
- `WHERE location <@ polygon` -> GiST (PostGIS)
- `WHERE created_at BETWEEN ...` em tabela de bilhoes de linhas -> BRIN
- `WHERE document @@ to_tsquery('search')` -> GIN

## 4. VACUUM e Autovacuum

MVCC cria "linhas mortas" (dead tuples). VACUUM limpa. Autovacuum automatico.

**Sinais de problema:** tabela crescendo sem parar (bloat). Queries cada vez mais lentas. `pg_stat_user_tables.n_dead_tup` alto.

**Ajustes:** `autovacuum_vacuum_scale_factor = 0.01` (dispara com 1% de dead tuples). `autovacuum_vacuum_cost_limit = 2000` (mais rapido).

## 5. Particionamento Nativo

```sql
CREATE TABLE orders (
  id UUID, user_id INT, status TEXT, created_at TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2025_01 PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

RANGE (datas), LIST (por status/pais), HASH (distribuicao uniforme).
Particionamento + cada particao pode ter indices diferentes.

## 6. CTEs e Window Functions

```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM orders
)
SELECT * FROM ranked WHERE rn <= 3; -- ultimos 3 pedidos por usuario

SELECT *, SUM(total) OVER (PARTITION BY user_id ORDER BY created_at) as running_total FROM orders;
```

## 7. Locking (pg_locks)

```sql
SELECT relation::regclass, mode, granted FROM pg_locks WHERE NOT granted;
```
**RowExclusiveLock:** INSERT/UPDATE/DELETE (compativel com outros RowExclusive).
**AccessExclusiveLock:** ALTER TABLE, DROP (bloqueia TUDO. Cuidado em producao).

Deadlock: PostgreSQL detecta e mata uma transacao automaticamente apos deadlock_timeout (1s).

## 8. Migrations (Flyway + Prisma)

### Flyway (Versionamento SQL)
```sql
-- V1__create_orders.sql
CREATE TABLE orders (id UUID PRIMARY KEY, customer_id VARCHAR, status VARCHAR, total JSONB, created_at TIMESTAMPTZ);

-- V2__add_outbox.sql
CREATE TABLE outbox (id UUID PRIMARY KEY, aggregate_id VARCHAR, event_type VARCHAR, payload JSONB, created_at TIMESTAMPTZ);

-- V3__add_order_index.sql
CREATE INDEX idx_orders_customer ON orders(customer_id);
```
Flyway aplica migrations em ORDEM. Tabela `flyway_schema_history` controla o que ja foi executado. Migrations sao IMUTAVEIS (nunca edite uma migration ja aplicada).

### Prisma Migrate (Declarativo)
```prisma
// schema.prisma
model Order {
  id         String   @id @default(uuid())
  customerId String
  status     String
  total      Json
  createdAt  DateTime @default(now())
  items      OrderItem[]
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])
  productId String
  productName String
  quantity  Int
  unitPrice Json
}
```
```bash
npx prisma migrate dev --name add_orders
npx prisma migrate deploy          # producao
npx prisma migrate status          # verificar estado
npx prisma studio                  # GUI para dados
```

### Flyway vs Prisma
| | Flyway | Prisma Migrate |
|---|--------|----------------|
| Como | SQL puro | Schema declarativo |
| Controle | Manual (V1, V2...) | Automatico |
| DB suportado | Qualquer SQL | PG, MySQL, SQLite, SQL Server, MongoDB |
| Melhor para | DBAs, SQL complexo, multi-DB | Devs, Node.js/TS stack |

### Boas Praticas
1. Migrations no repo (versionadas). Nunca aplicar SQL manual em producao.
2. Migration = 1 mudanca logica por arquivo.
3. Testar rollback (Flyway: `flyway undo` se tiver undo script).
4. Backup antes de migration pesada (ALTER TABLE em tabelas gigantes).

---

## 9. Ferramentas de Diagnostico

```sql
-- Queries mais lentas
SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- Indices nao usados
SELECT indexrelid::regclass, idx_scan FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- Tabelas com mais dead tuples
SELECT relname, n_dead_tup, n_live_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;
```
