# Boas Práticas de API — Referência Detalhada

## 1. Paginação — 6 Técnicas

### Offset-Based
```
GET /users?offset=0&limit=20  → registros 1-20
```
`SELECT * FROM users LIMIT 20 OFFSET 40`
- **Prós:** simples, pular para qualquer página
- **Contras:** performance degrada com offset grande; inconsistente com inserts/removes entre páginas

### Cursor-Based
```
GET /users?cursor=eyJpZCI6NDJ9&limit=20
Response: { "data": [...], "next_cursor": "eyJpZCI6NjJ9" }
```
`SELECT * FROM users WHERE id > 42 ORDER BY id LIMIT 20`
- **Prós:** O(1) em qualquer posição; consistente (sem pular/duplicar)
- **Contras:** não dá para pular para "página 5"; cursor precisa ser opaco
- **Exemplos reais:** Stripe API (`starting_after`), Twitter API

### Page-Based
```
GET /users?page=1&size=20
Response: { "data": [...], "page": 1, "total_pages": 50, "total_items": 1000 }
```
- **Prós:** familiar, fácil UI de paginação
- **Contras:** mesmo problema do offset; COUNT(*) caro em tabelas grandes

### Keyset-Based
```
GET /users?after_id=42&limit=20
```
Similar ao cursor, mas expõe chave diretamente.

### Time-Based
```
GET /events?start_time=2024-01-01T00:00:00Z&end_time=2024-01-02T00:00:00Z
```
Natural para dados temporais. Ideal para logs, eventos, métricas.

### Híbrida
Combina cursor + time. Ex: `?cursor=abc&since=2024-01-01&until=2024-02-01`

---

## 2. Rate Limiting

### Algoritmos

**Token Bucket (recomendado para APIs públicas)**
- Balde com N tokens máximos, recarga a taxa fixa (10 tokens/s)
- Cada req consome 1 token; balde vazio → `429`
- Permite bursts (acumula tokens)
- Lida bem com tráfego em rajada

**Fixed Window**
- 100 req/minuto, contador zera a cada janela
- Problema: 100 req às 12:59:59 + 100 req às 12:00:01 = 200 em 2 segundos

**Sliding Window Log**
- Mantém log de timestamps, conta nos últimos N segundos
- Preciso, mas mais memória

**Sliding Window Counter**
- Híbrido: fixed window + weighted previous window
- Bom equilíbrio. Usado por Cloudflare, Kong.

### Headers Padrão
```http
RateLimit-Limit: 100
RateLimit-Remaining: 73
RateLimit-Reset: 1708300800
Retry-After: 45
```

---

## 3. Tratamento de Erros

### Estrutura Consistente
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Saldo insuficiente para esta operação.",
    "details": [{
      "field": "amount",
      "reason": "Valor excede saldo disponível de R$ 50,00"
    }],
    "request_id": "req_abc123"
  }
}
```

### Regras
- Sempre `request_id` para rastreamento
- Códigos legíveis por máquina (`INSUFFICIENT_FUNDS`, não "Erro 27")
- Erros de validação: indique campo + motivo
- NUNCA exponha stack traces em produção
- Documente todos os códigos de erro por endpoint

---

## 4. Performance — 5 Melhorias

1. **Compressão:** `Content-Encoding: gzip` ou `br` (Brotli, ~20% menor)
2. **Paginação:** nunca retorne tabela inteira; defina limite máximo
3. **Field Selection:** `GET /users?fields=id,name,avatar` (sparse fieldsets)
4. **Embedding Condicional:** `GET /users?include=orders` (evita N+1 sem forçar)
5. **Conditional Requests:** `If-None-Match: "abc123"` → `304 Not Modified` (sem body)

---

## 5. Webhooks vs Polling

### Polling (Cliente pergunta)
```
Cliente: "Tem algo?" → Servidor: "Não" (× N vezes)
```
- **Prós:** simples, firewall-friendly
- **Contras:** requisições vazias, latência até próximo poll

### Webhooks (Servidor avisa)
```
Servidor: "Aconteceu algo! Dados: {...}" → Cliente
```
- **Prós:** tempo real, eficiente
- **Contras:** cliente precisa de endpoint público; validar assinatura
- **Assinatura:** HMAC-SHA256(payload, secret) — cliente verifica
- **Retry:** exponential backoff (0s, 5min, 15min, 1h, 4h, 8h, 24h...)
- **Exemplo real:** Stripe webhooks

---

## 6. API Gateway

```
Clientes → [API Gateway] → Users, Orders, Payments, Notifications
```

### Funcionalidades
1. Routing (`/users/*` → user-service)
2. Authentication (valida tokens)
3. Rate Limiting (global)
4. Request/Response Transformation
5. Logging & Monitoring
6. SSL Termination
7. API Composition
8. Caching

### API Gateway vs Reverse Proxy vs Load Balancer
| | API Gateway | Reverse Proxy | Load Balancer |
|---|------------|---------------|---------------|
| Nível | L7 (HTTP/API) | L7 (HTTP) | L4 ou L7 |
| Auth | Sim | Não | Não |
| Rate Limit | Sim | Não | Básico |
| Transform | Sim | Sim | Não |
| SSL Term | Sim | Sim | L7 apenas |

### Opções: Kong, AWS API Gateway, Apigee, Envoy, Traefik, Nginx+OpenResty

---

## 7. Testes de API — 9 Tipos

1. **Smoke:** endpoints respondem?
2. **Functional:** comportamento correto?
3. **Integration:** API + DB + cache juntos
4. **Regression:** mudanças não quebraram nada?
5. **Load:** quantas req/s aguenta? (k6, Artillery)
6. **Stress:** qual o ponto de quebra?
7. **Security:** SQL injection, XSS, token bypass
8. **Contract:** consumidor vs provedor (Pact)
9. **Fuzz:** dados aleatórios/inválidos

### Ferramentas
| Ferramenta | Tipo |
|-----------|------|
| Postman | Manual + automated |
| Insomnia | Open-source, GraphQL nativo |
| Hoppscotch | Web-based, open-source |
| Thunder Client | Extensão VS Code |
| k6 | Load testing (JS) |
| Pact | Contract testing |
| ReadyAPI | Enterprise suite |

---

## 8. 8 Tips para API Design Eficiente

1. **HTTPS sempre** — sem exceção
2. **Versionar APIs** — `/v1/` é o padrão da indústria
3. **Substantivos, não verbos** — `/users` não `/getUsers`
4. **Paginar resultados** — com limite máximo
5. **Permitir filtragem, ordenação e field selection**
6. **Retornar códigos HTTP corretos** — use a semântica certa
7. **Documentar com OpenAPI/Swagger** — spec é contrato
8. **Rate limiting desde o início** — mais fácil adicionar no design que depois

## 9. O Panorama em Evolução dos Protocolos de API

| Protocolo | Estilo | Transporte | Melhor para |
|-----------|--------|------------|-------------|
| REST | Recursos | HTTP/1.1, HTTP/2 | APIs públicas, CRUD |
| GraphQL | Query | HTTP | Dados interconectados |
| gRPC | RPC | HTTP/2 | Service-to-service |
| WebSocket | Full-duplex | TCP (upgrade HTTP) | Tempo real |
| SSE | Server push | HTTP | Streams unidirecionais |
| Webhook | Callback | HTTP | Eventos, notificações |
| SOAP | RPC (XML) | HTTP/SMTP | Enterprise legado |
| MQTT | Pub/Sub | TCP | IoT, dispositivos leves |
