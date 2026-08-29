# Figma — 100x Postgres Scaling

## 1. O Contexto

Figma é uma ferramenta de design colaborativo em tempo real. Começou com um PostgreSQL simples. Cresceu até servir milhões de usuários simultâneos editando os mesmos arquivos.

**O desafio:** Postgres é single-writer. Como escalar quando centenas de usuários estão editando o mesmo design ao mesmo tempo?

---

## 2. Estratégias de Escala (Ordem de Aplicação)

### 1. Particionamento por Projeto
```
projects: project_1 → schema project_1 (tabelas próprias)
          project_2 → schema project_2
```
Cada projeto tem seu próprio schema no PostgreSQL. Isso distribui locks, índices e I/O.

### 2. PgBouncer (Connection Pooling)
```
[Thousands of clients] → [PgBouncer: 50 connections] → [PostgreSQL]
```
Sem PgBouncer: cada cliente = uma conexão PostgreSQL (memória, CPU). Com PgBouncer: pool de conexões reutilizáveis. Modo transaction.

### 3. Read Replicas para Queries Analíticas
```
[Master] → WAL shipping → [Read Replica 1] → analytics, reports
                         → [Read Replica 2] → backups
```
Zero impacto no master. Analytics e backups vão para réplicas.

### 4. Materialized Views
```sql
CREATE MATERIALIZED VIEW project_stats AS
SELECT project_id, COUNT(*), SUM(file_size)
FROM files GROUP BY project_id;
```
Dados pré-computados. Evita queries pesadas repetitivas.

### 5. Vertical + Horizontal Scaling Gradual
Começaram com 1 servidor. Adicionaram RAM. Depois read replicas. Depois particionamento. **Escalaram conforme precisavam, não antes.**

---

## 3. Live Collaboration (O Mais Difícil)

**Problema:** múltiplos usuários editando o mesmo design simultaneamente. Como sincronizar?

### CRDTs (Conflict-free Replicated Data Types)
- Cada operação é um evento com timestamp
- Conflitos são resolvidos automaticamente (sem locking central)
- Usuário vê estado eventualmente consistente, mas MUITO rápido

```
User A: move retângulo (x:10, y:20)
User B: muda cor do mesmo retângulo (blue)
→ CRDT merge: retângulo em (x:10, y:20) azul. Ambos corretos.
```

---

## 4. Lições

1. **PostgreSQL escala MUITO mais do que as pessoas pensam.** Figma chegou a 100x sem trocar de DB.
2. **Particionamento por tenant** (projeto) é o padrão mais natural.
3. **PgBouncer é obrigatório** para qualquer Postgres com muitos clientes.
4. **CRDTs permitem colaboração em tempo real sem locking central.**
5. **Escale quando precisar.** Não otimize prematuramente.

---

## 5. Stack
- **Backend:** Rust, TypeScript
- **DB:** PostgreSQL (com schemas por projeto)
- **Pooling:** PgBouncer
- **Real-time:** WebSocket + CRDTs
- **Renderização:** WebAssembly + WebGL
