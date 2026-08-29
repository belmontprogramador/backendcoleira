---
name: microservicos
description: "Arquitetura de microsserviços, 12-Factor App, Kafka, padrões de mensageria, idempotência, resiliência e observabilidade."
---

# Microsserviços

Cobre arquitetura de microsserviços (melhores práticas, monolith vs microservices), 12-Factor App, Kafka (partições, consumers, exactly-once), padrões de mensageria (pub/sub, DLQ, competing consumers), idempotência, estratégias de retry e resiliência.

## Quando usar

- Projetando ou migrando para microsserviços
- Avaliando monolith vs microservices (Conway's Law)
- Configurando Kafka (partições, garantias de entrega)
- Implementando padrões de mensageria (DLQ, idempotência, retry)
- Projetando resiliência (circuit breaker, bulkhead, timeout)

## Fluxo

1. Identifique a área: arquitetura, mensageria, resiliência ou 12-factor
2. Carregue a referência relevante em `references/`
3. Microsserviços abrangem: design de serviço, comunicação entre serviços e tolerância a falhas

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [arquitetura.md](references/arquitetura.md) | 9 best practices, monolith vs micro, Conway's Law, quando migrar |
| [12-factor.md](references/12-factor.md) | 12 fatores detalhados com exemplos práticos |
| [kafka.md](references/kafka.md) | Partições, consumers, garantias, Kafka Streams, KSQL |
| [mensageria.md](references/mensageria.md) | Padrões cloud messaging, idempotência, DLQ, retry |
| [resiliencia.md](references/resiliencia.md) | Circuit breaker, bulkhead, service mesh, observabilidade |`n| [observabilidade.md](references/observabilidade.md) | OpenTelemetry, Prometheus/Grafana, SLOs, alertas, logs estruturados |
