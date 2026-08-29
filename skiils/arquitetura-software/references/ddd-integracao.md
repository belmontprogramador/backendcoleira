# DDD e Integracao entre Contextos

## 1. Domain Events vs Integration Events

**Domain Event:** interno ao Bounded Context. Tipado (Money, OrderId). Classe TS.
**Integration Event:** entre Bounded Contexts. JSON/Protobuf. Contrato PUBLICO e versionado.

Traducao: OrderEventTranslator converte Domain Event -> Integration Event.
Domain Events nunca vazam para fora do contexto.

## 2. Saga Pattern (no DDD)

Transacoes cross-context sem 2PC. Cada passo = transacao LOCAL em seu contexto.

**Orchestration:** Saga Manager coordena. Passos + compensacoes.
**Choreography:** cada contexto escuta eventos e reage. Desacoplado.

## 3. Outbox Pattern

Garantir DB commit + publicacao de evento atomicos:
```sql
BEGIN; INSERT INTO orders; INSERT INTO outbox; COMMIT;
```
Aggregate acumula eventos -> pullEvents() -> salva na outbox junto com aggregate.

## 4. CQRS (no DDD)

Separar write (Aggregate, PG) de read (Projecoes, ES/Redis).
Projecoes escutam Domain Events e atualizam Read Models.

## 5. Event Sourcing (no DDD)

Aggregate reconstroi estado do historico de eventos.
`Order.fromHistory(events)` -> aplica cada evento.
Snapshot a cada N eventos para performance.

## 6. Decisao de Integracao

| Situacao | Padrao |
|----------|--------|
| Precisa de dado AGORA | Request-Response (REST/gRPC via ACL) |
| Precisa reagir a eventos | Integration Events (Kafka) |
| Consistencia cross-context | Saga |
| So leitura de outro contexto | CQRS + Projecoes |
| Audit trail completo | Event Sourcing |
