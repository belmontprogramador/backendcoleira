# Locks e Transacoes — Referencia Detalhada

## 1. Por que Locks?

Sem locks, duas transacoes modificariam o mesmo dado simultaneamente = corrupcao.

## 2. Tipos de Locks

### Por Granularidade
| Lock | Escopo | Concorrencia |
|------|--------|-------------|
| Row-Level | Uma linha | Maxima |
| Page-Level | Bloco (4-8KB) | Media |
| Table-Level | Tabela inteira | Baixa |

### Por Finalidade
| Lock | Descricao | Compat. com S? | Compat. com X? |
|------|-----------|----------------|-----------------|
| Shared (S) | Leitura, multiplos | Sim | Nao |
| Exclusive (X) | Escrita, bloqueia tudo | Nao | Nao |
| Update (U) | Previne deadlock | So com S | Nao |

**Update Lock previne deadlock:**
1. Processo A adquire U lock (so 1 U por recurso)
2. Processo B tenta U lock -> espera
3. A promove U->X, faz update, libera
4. B adquire U->X

### Locks Especiais
| Lock | Proposito |
|------|-----------|
| Schema | Protege estrutura (DDL) |
| Bulk Update | Otimiza INSERT em massa |
| Key-Range | Previne phantom reads |
| Advisory | Lock customizado via app |

## 3. Isolation Levels

### Fenomenos Indesejados
- **Dirty Read:** T2 le dado nao-committed de T1
- **Non-Repeatable Read:** mesma query retorna valores diferentes
- **Phantom Read:** mesma query retorna linhas diferentes

### Matriz
| Nivel | Dirty Read | NR Read | Phantom |
|-------|------------|---------|---------|
| Read Uncommitted | Sim | Sim | Sim |
| Read Committed | Nao | Sim | Sim |
| Repeatable Read | Nao | Nao | Sim* |
| Serializable | Nao | Nao | Nao |

*MySQL previne phantom no RR. PG so no Serializable.

### Escolha Pratica
| Use Case | Nivel |
|----------|-------|
| Analytics | Read Committed |
| CRUD padrao | Read Committed (padrao PG) |
| Transferencia | Repeatable Read / Serializable |
| Reserva/Booking | Serializable |

## 4. Deadlock

```
T1: lock A -> espera B (locked T2)
T2: lock B -> espera A (locked T1)
= Deadlock
```

**Banco resolve:** detecta ciclo -> ROLLBACK na vitima. Timeout padrao PG: 1s.

**Prevenir:**
1. Ordem consistente de locks
2. Transacoes curtas
3. Use indices (menos linhas lockadas)
4. Retry com backoff

## 5. Controle de Concorrencia

### Pessimistic
```sql
SELECT * FROM pedidos WHERE id = 99 FOR UPDATE;  -- lock
UPDATE pedidos SET status = 'pago' WHERE id = 99;
```
Assume conflito. Trava antes. Bom para alta contenção.

### Optimistic
```sql
SELECT version FROM pedidos WHERE id = 99;  -- version = 3
UPDATE pedidos SET status = 'pago', version = 4 WHERE id = 99 AND version = 3;
-- 0 rows = conflito
```
Assume conflito raro. Verifica so no UPDATE. Bom para baixa contenção.

### MVCC
PostgreSQL, Oracle. Cada transacao ve snapshot proprio. Leitores e escritores nao bloqueiam entre si.
