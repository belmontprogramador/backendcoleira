# Mensageria e Padroes Cloud — Referencia Detalhada

## 1. Top 6 Padroes de Mensageria

**1. Pub/Sub:** 1:N. Publisher nao sabe quem consome. SNS, Kafka, EventBridge.
**2. Point-to-Point:** fila com consumidor unico. SQS, RabbitMQ.
**3. Request-Reply:** sincrono (HTTP) ou assincrono (reply-to queue).
**4. Competing Consumers:** multiplos consumidores disputam mesma fila. Escala horizontal.
**5. Priority Queue:** mensagens criticas furam a fila. RabbitMQ x-max-priority.
**6. Dead Letter Queue:** falhou N vezes -> DLQ. Job investiga, corrige, reprocessa.

## 2. Idempotencia

### Idempotency Key (Stripe Model)
```
POST /orders
Header: Idempotency-Key: abc-123
Servidor: procurar key -> se existe, retorna cache -> se nao, processa e armazena
```

### Top 6 Casos Obrigatorios
1. REST API (PUT/DELETE idempotentes, POST precisa key)
2. Pagamentos (Stripe, PayPal usam)
3. Pedidos (uma compra = um pedido)
4. Operacoes DB (INSERT ... ON CONFLICT DO NOTHING)
5. Contas usuario (um cadastro por email)
6. Mensageria (consumer processa mesma msg multiplas vezes)

## 3. Retry Strategies

**Exponential Backoff:** 1s, 2s, 4s, 8s -> DLQ
**Exponential + Jitter:** random(0.5-1.5s), random(1-3s), random(2-6s). Evita thundering herd.

Regras: so retry em erros TRANSITORIOS. NUNCA em 400/401/404. Limite maximo. Idempotencia obrigatoria.

## 4. Dead Letter Queue na Pratica

[Main Queue] -> [Consumer] -> falha -> [Retry 1..3] -> falha -> [DLQ] -> [DLQ Processor] -> investigar/corrigir/reprocessar

## 5. Garantias de Entrega

**At-most-once:** fire and forget. Pode perder.
**At-least-once:** retry ate confirmar. Pode duplicar (precisa idempotencia).
**Exactly-once:** Kafka transactions + idempotent producer. Mais complexo.

Na pratica: at-least-once + idempotencia resolve 95% dos casos.
