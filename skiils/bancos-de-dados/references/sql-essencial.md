# SQL Essencial — Referencia Detalhada

## 1. Os 5 Componentes da Linguagem SQL

### DDL — Data Definition Language
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
```

### DQL — Data Query Language
```sql
SELECT u.name, COUNT(o.id) as total
FROM users u LEFT JOIN orders o ON u.id = o.user_id
WHERE u.active = true
GROUP BY u.id HAVING COUNT(o.id) > 5
ORDER BY total DESC LIMIT 10;
```

### DML — Manipulacao
```sql
INSERT INTO users (name, email) VALUES ('Joao', 'joao@email.com');
UPDATE users SET active = false WHERE id = 42;
DELETE FROM users WHERE id = 99;
```

### DCL — Controle
```sql
GRANT SELECT, INSERT ON users TO app_user;
REVOKE DELETE ON users FROM app_user;
```

### TCL — Transacional
```sql
BEGIN;
UPDATE contas SET saldo = saldo - 100 WHERE id = 1;
UPDATE contas SET saldo = saldo + 100 WHERE id = 2;
COMMIT;
```

---

## 2. Indices na Pratica

### Quando Criar
```sql
CREATE INDEX idx_orders_status ON orders(status);         -- WHERE
CREATE INDEX idx_items_order_id ON order_items(order_id); -- JOIN
CREATE INDEX idx_posts_created ON posts(created_at DESC);  -- ORDER BY
CREATE INDEX idx_orders_user_status ON orders(user_id, status); -- composto
```
Ordem importa: (user_id, status) serve `WHERE user_id=?` mas NAO `WHERE status=?`.

### Quando NAO Criar
- Tabelas < 1000 linhas (full scan mais rapido)
- Colunas baixa cardinalidade (boolean)
- Colunas muito atualizadas

### Verificando (PostgreSQL)
```sql
SELECT indexname, idx_scan FROM pg_stat_user_indexes
WHERE idx_scan = 0 ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 3. Query Optimization

**SELECT * e veneno:** `SELECT id, name` sobre `SELECT *`

**EXISTS vs IN:** EXISTS para no primeiro match (geralmente melhor)

**Paginacao eficiente:**
```sql
-- Ruim: LIMIT 20 OFFSET 1000000
-- Bom: WHERE id > 1000000 ORDER BY id LIMIT 20
```

**UNION ALL vs UNION:** UNION ALL nao remove duplicatas = mais rapido

**Evite funcoes em WHERE:**
```sql
-- Ruim: WHERE DATE(created_at) = '2024-01-01'
-- Bom: WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02'
```

**EXPLAIN ANALYZE:** veja Seq Scan vs Index Scan, tempo real, buffers

---

## 4. Boas Praticas

**Naming:** tabelas plural snake_case (`order_items`), colunas singular (`user_id`)

**Tipos corretos:** BIGSERIAL/UUID para ID, DECIMAL para dinheiro, TIMESTAMPTZ para timestamp, BOOLEAN para bool

**Constraints sempre:** NOT NULL, UNIQUE, CHECK, FOREIGN KEY, DEFAULT — ultima linha de defesa

---

## 5. Joins

INNER JOIN (so matches), LEFT JOIN (tudo da esquerda), FULL JOIN (tudo de ambos), LATERAL (subquery com colunas externas)
