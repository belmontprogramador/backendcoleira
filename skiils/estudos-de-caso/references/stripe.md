# Stripe — API Design e Idempotencia

## 1. Idempotency Keys

POST /charges + Header Idempotency-Key: abc-123
Servidor: se key existe no cache -> retorna resposta ORIGINAL. Se nao -> processa + armazena (key + response + 24h TTL).
Retry com mesma key = resposta identica. Payload diferente com mesma key = erro 422.

## 2. API Design Padrao Ouro

Versionamento: /v1/charges. Paginacao cursor-based (starting_after). Erros: { error: { type, code, message, param, request_id } }. Rate Limiting em headers.

## 3. Webhooks

POST /webhooks com assinatura Stripe-Signature (HMAC-SHA256).
Retry exponential: 0s, 5min, 15min, 1h, 4h, 8h, 24h, 48h, 72h -> desiste.
Webhooks PRECISAM ser idempotentes.

## 4. Licoes
1. Idempotency keys OBRIGATORIAS para financas
2. Cursor-based pagination > offset
3. Erros consistentes = automacao
4. Webhooks: assinatura + retry + idempotencia
