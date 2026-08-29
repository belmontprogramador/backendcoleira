# Apache Kafka — Referência Detalhada

## 1. Arquitetura

```
[Producer] → [Kafka Broker] → [Partition 0: [msg1][msg2][msg3]...]
                              → [Partition 1: [msg4][msg5][msg6]...]
                              → [Partition 2: [msg7][msg8][msg9]...]
                                              ↓
                              [Consumer Group] → cada consumer lê partições exclusivas
```

### Conceitos-Chave
- **Topic:** categoria/feed de mensagens (ex: `orders`, `user-events`)
- **Partition:** divisão do tópico. Unidade de paralelismo e escala
- **Offset:** posição única da mensagem dentro da partição
- **Consumer Group:** consumidores que dividem partições entre si
- **Broker:** servidor Kafka. Cluster = múltiplos brokers
- **Replication Factor:** quantas cópias de cada partição (ex: 3 = tolera 2 falhas)
- **Leader:** partição líder recebe escritas/leituras. Followers replicam

---

## 2. Por que Kafka é Rápido?

### Zero-Copy
Dados vão do disco → rede sem cópia intermediária pela CPU. `sendfile()` syscall do Linux. Economiza ciclos de CPU e memória.

### Append-Only Log
Escrita é sempre SEQUENCIAL (final do log). Discos (HDD e SSD) são excelentes em escrita sequencial (100+ MB/s). Comparado com escrita aleatória (100+ IOPS). Append = sem seek.

### Batch Processing
Producer acumula mensagens → envia em lote. Consumer lê em lote. Menos round-trips de rede.

### Compressão
Mensagens comprimidas (gzip, snappy, lz4, zstd). Menos dados na rede e no disco.

### Page Cache
Kafka depende pesadamente do page cache do Linux. Dados quentes são servidos da RAM sem leitura de disco. Kafka não mantém cache próprio — delega ao SO.

### Partitioning
Tópico dividido em N partições = N streams paralelas de escrita e leitura. Escala horizontal natural.

---

## 3. Garantias de Entrega

### Producer
| Config | Garantia | Performance |
|--------|----------|-------------|
| `acks=0` | Fire-and-forget. Pode perder | Máxima |
| `acks=1` | Leader confirma. Perde se leader cair | Alta |
| `acks=all` | Leader + ISRs confirmam. Sem perda | Menor |

**ISR (In-Sync Replicas):** réplicas que estão em sync com o leader. `acks=all` + `min.insync.replicas=2` = pelo menos leader + 1 follower confirmam.

### Idempotent Producer
`enable.idempotence=true`: Producer atribui sequence number. Broker deduplica.

### Consumer
| Estratégia | Risco |
|-----------|-------|
| Auto-commit | Perde se crashar após commit e antes de processar |
| Manual commit após processar | Seguro (at-least-once) |
| Exactly-once (Kafka Streams + transactions) | Sem duplicata, sem perda |

### Exactly-Once Semantics
```
Producer: enable.idempotence=true + transactional.id
Consumer: isolation.level=read_committed
```
Kafka transactions garantem atomicidade: produzir mensagem + commit offset na mesma transação.

---

## 4. Top 5 Casos de Uso

### 1. Message Broker
Desacoplamento produtor/consumidor. Alternativa a RabbitMQ para alta vazão.

### 2. Event Sourcing
Event store durável. Eventos imutáveis, append-only. Replay de histórico.

### 3. Stream Processing
Kafka Streams (biblioteca Java), KSQL (SQL sobre streams). Transformação, agregação, join de streams.

### 4. Log Aggregation
Coleta centralizada de logs. Filebeat → Kafka → Logstash → Elasticsearch.

### 5. CDC (Change Data Capture)
Debezium → Kafka. Mudanças no DB viram eventos.

---

## 5. Kafka Streams

Biblioteca Java (sem cluster separado). Conceitos:
- **KStream:** stream infinito de eventos
- **KTable:** estado atual (último valor por chave)
- **GlobalKTable:** tabela replicada em todas as instâncias

```java
KStream<String, Order> orders = builder.stream("orders");
KTable<String, User> users = builder.table("users");

orders.join(users, (order, user) -> new EnrichedOrder(order, user))
      .filter((key, enriched) -> enriched.getTotal() > 100)
      .to("high-value-orders");
```

---

## 6. KSQL

SQL sobre streams Kafka. Sem código Java. Exemplo:
```sql
CREATE STREAM orders (id VARCHAR, user_id VARCHAR, total DOUBLE)
  WITH (kafka_topic='orders', value_format='JSON');

CREATE TABLE high_value AS
  SELECT user_id, SUM(total) as total
  FROM orders
  WINDOW TUMBLING (SIZE 1 HOUR)
  GROUP BY user_id
  HAVING SUM(total) > 1000;
```

---

## 7. Configurações Críticas

| Config | Recomendação |
|--------|-------------|
| `replication.factor` | 3 (mínimo para produção) |
| `min.insync.replicas` | 2 (tolerância a 1 falha) |
| `acks` | `all` para dados importantes |
| `compression.type` | `lz4` (bom equilíbrio CPU/compressão) |
| `retention.ms` | Tempo de retenção (ex: 7 dias) |
| `num.partitions` | Dimensione para throughput futuro |
