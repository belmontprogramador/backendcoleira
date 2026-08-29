# Event Sourcing, CDC e CQRS — Referencia Detalhada

## 1. Event Sourcing

### O Paradigma
Em vez de persistir o **estado atual**, persistimos a **sequencia de eventos** que levaram a ele.

**Tradicional (CRUD):**
```
orders: { id: 99, status: "entregue", total: 150.00 }
```

**Event Sourcing:**
```
events: [
  { type: "PedidoCriado", order_id: 99, items: [...], total: 150.00 },
  { type: "PagamentoConfirmado", order_id: 99 },
  { type: "PedidoEnviado", order_id: 99, tracking: "BR123" },
  { type: "PedidoEntregue", order_id: 99 }
]
```
Estado atual = replay de todos os eventos. Event store e a fonte da verdade.

### Vantagens
- Audit trail completo (cada mudanca registrada)
- Time travel (reconstruir estado em qualquer ponto)
- Debug reproduzivel (eventos exatos)
- Novas projecoes sem migrar dados
- Desacoplamento (servicos downstream consomem eventos)

### Desvantagens
- Complexidade mental e de tooling
- Performance de leitura (mitigar com snapshots)
- Schema evolution de eventos
- Consistencia eventual nas projecoes

### Casos Reais
1. **New York Times:** artigos desde 1851 como eventos -> views ElasticSearch
2. **Sistema bancario:** cada transacao e evento; saldo = soma de eventos
3. **E-commerce:** carrinho gera eventos -> Kafka -> fraud, billing, email

### Snapshots
```
Estado T1000 (snapshot) + eventos T1001 a T1005 = estado atual
```
Evita replay de milhoes de eventos.

---

## 2. CDC (Change Data Capture)

Capturar mudancas no banco (INSERT, UPDATE, DELETE) e publicar como stream de eventos.

### Como Funciona
1. App faz INSERT/UPDATE/DELETE normal
2. CDC connector le log de transacoes (WAL do PG, binlog do MySQL)
3. Transforma mudanca em evento
4. Publica em Kafka
5. Consumidores processam

### Ferramentas
| Ferramenta | Descricao |
|-----------|-----------|
| Debezium | Open-source, Kafka Connect, PG/MySQL/MongoDB/Oracle |
| AWS DMS | Gerenciado, migracao + CDC continuo |
| Google Datastream | CDC serverless para Cloud SQL, BigQuery |

### Casos de Uso
1. Sincronizacao: DB principal -> CDC -> Redis, Elasticsearch, BigQuery
2. Microservices data sync (cada servico com seu DB)
3. Audit log automatico
4. Real-time analytics
5. CQRS (CDC alimenta read model)

---

## 3. CQRS (Command Query Responsibility Segregation)

Separar **escrita** (Commands) de **leitura** (Queries) com modelos diferentes.

```
Command -> [Write DB] --CDC--> [Read DB] <- Query
POST /orders            eventos    GET /orders
```

**Write DB:** otimizado para escritas (PostgreSQL, ACID)
**Read DB:** otimizado para queries (desnormalizado, Elasticsearch, Redis)

### Quando Usar
- Leitura e escrita com padroes muito diferentes
- Leitura precisa de dados agregados/denormalizados
- Multiplos read models para diferentes casos de uso

### Quando NAO Usar
- CRUD simples (complexidade nao se paga)
- Dados precisam ser consistentes imediatamente

---

## 4. Outbox Pattern

**Problema:** como garantir que o evento foi publicado E a transacao committed atomicamente?

```sql
BEGIN;
INSERT INTO orders (...) VALUES (...);
INSERT INTO outbox (event_type, payload) VALUES ('PedidoCriado', '{"order_id": 99}');
COMMIT;
-- Processo separado le outbox e publica em Kafka
```
Se falhar -> evento nao inserido. Se commit ok -> evento sera publicado.

## 5. Saga Pattern

Transacoes distribuidas sem 2PC. Cada passo = transacao local + evento.
- **Orchestration:** Saga Manager coordena
- **Choreography:** cada servico reage a eventos

```
Criar Pedido -> Reservar Estoque -> Cobrar Pagamento -> Enviar
    | falha          | falha              | falha
  Cancelar       Liberar estoque      Estornar
```
Compensacao em cada passo garante consistencia eventual.
