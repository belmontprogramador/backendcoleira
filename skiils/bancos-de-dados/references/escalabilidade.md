# Escalabilidade de Dados — Referencia Detalhada

## 1. As 7 Estrategias em Ordem de Complexidade

Sharding e a ultima opcao. Antes disso, esgote estas.

### 1. Indexacao
Tipos: B-tree (padrao), Hash (igualdade), GIN (full-text/JSONB), GiST (geo), BRIN (time-series), Partial (ativos), Composite (multiplas colunas).

Regras: indexe WHERE, JOIN, ORDER BY. Ordem importa: (a,b) serve `WHERE a=?` mas NAO `WHERE b=?`. Monitore `pg_stat_user_indexes` para indices nao usados.

### 2. Materialized Views
```sql
CREATE MATERIALIZED VIEW vendas_diarias AS
SELECT date_trunc('day', created_at) AS dia, SUM(total) AS total
FROM orders GROUP BY 1;
```
Pre-computa queries caras. Dados stale ate REFRESH.

### 3. Read Replicas + Write Master
```
        -> [Read Replica 1] <- leituras
[Master] -> [Read Replica 2] <- leituras
  ^ escritas
```
Escalas leituras linearmente. Replicas podem servir analytics. Cuidado: replication lag. Escritas continuam no master unico.

### 4. Database Sharding
Ver `sharding.md`. Ultima bala de prata.

### 5. Denormalizacao
Duplicar dados para evitar joins. `orders` tem `user_name` duplicado. Rapido, mas risco de inconsistencia.

### 6. Caching Layers
Redis, CDN, cache local. Ver skill `system-design-fundamentals`.

### 7. Connection Pooling
```
App -> [Pool (20 conexoes)] -> DB
```
PgBouncer (PG), HikariCP (Java), RDS Proxy (AWS). Modo Transaction recomendado.

---

## 2. Sinais e Solucoes

| Sintoma | Estrategia |
|---------|-----------|
| Queries lentas com WHERE | Indices |
| Relatorios matando producao | Materialized Views ou Read Replicas |
| Leituras congestionadas | Read Replicas |
| Escritas congestionadas | Sharding |
| Conexoes estouradas | Connection Pooling |
| Joins complexos lentos | Denormalizacao ou Caching |
