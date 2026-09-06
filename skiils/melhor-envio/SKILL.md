---
name: melhor-envio
description: >
  Referência da API Melhor Envio (logística/fretes do Brasil) — cálculo de
  frete, rastreamento de pedidos e envio/despacho (carrinho, checkout, geração
  e impressão de etiquetas). OAuth 2.0 (Authorization Code), webhooks com
  HMAC-SHA256 e ambiente sandbox. Base para a integração de logística no Elopet.
user-invocable: true
---

# Melhor Envio API — logística e fretes (BR)

> **Fonte:** Documentação oficial — https://docs.melhorenvio.com.br
> **Índice completo:** https://docs.melhorenvio.com.br/llms.txt (append `.md` a qualquer URL)
> **Base:** `/api/v2` · REST + JSON · gratuita para integrar (só o frete é pago)

## Conceitos Fundamentais

- **Aplicativo (app)** = registro da sua plataforma no Painel → Integrações → Área Dev.
  Gera `client_id` + `client_secret` + `redirect_uri` (callback). Normalmente **1 app
  por plataforma**, servindo toda a base de lojistas.
- **OAuth 2.0 (Authorization Code)** — cada lojista autoriza o app e recebe um
  `access_token` (JWT) atrelado à conta dele. Para o Elopet (conta única), é **1 par
  access/refresh** armazenado e renovado pelo backend.
- **Sandbox vs Produção** — ambientes **distintos**, dados não migram entre eles.
  - Sandbox: `https://sandbox.melhorenvio.com.br/` (saldo fictício R$ 10.000; só
    Correios + Jadlog; pagamento só Yapay; status mudam a cada 15 min).
  - Produção: `https://melhorenvio.com.br/`.
- **Etiqueta (order)** = o objeto central. Nasce no carrinho, é paga no checkout,
  gerada e impressa. Depois é rastreada pelo `id`/`protocol`.

## Autenticação (OAuth 2.0)

Fluxo **Authorization Code**:

1. **Autorizar** (navegador do lojista):
   ```
   GET {base}/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&state=...&scope=...
   ```
2. Melhor Envio redireciona para `redirect_uri?code=...` (callback deve ser **idêntico**
   ao cadastrado — senão `Client invalid`).
3. **Trocar o code por token** (server-to-server):
   ```
   POST {base}/oauth/token
   grant_type=authorization_code  code=...  client_id=...  client_secret=...  redirect_uri=...
   ```
4. **Renovar** (obrigatório — token expira):
   ```
   POST {base}/oauth/token
   grant_type=refresh_token  refresh_token=...
   ```

**Validade:** `access_token` = **30 dias** · `refresh_token` = **45 dias**. Implemente
renovação automática (no 401/expiração, usa o refresh e re-tenta).

**Headers obrigatórios em toda chamada autenticada:**
```
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
User-Agent: MinhaApp (email@contato.com)   ← OBRIGATÓRIO (senão a API rejeita)
```

**Scopes (permissões):** `shipping-calculate`, `shipping-tracking`, `shipping-generate`,
`shipping-checkout`, `shipping-print`, `shipping-preview`, `shipping-cancel`,
`shipping-companies`, `orders-read`, `cart-read`, `cart-write`.

---

## 1) Cálculo de frete (cotação)

**`POST /api/v2/me/shipment/calculate`** · scope `shipping-calculate`

Dois modos (payloads diferentes):
- **Por produtos** (`products[]`) — o Melhor Envio faz o empacotamento sozinho.
- **Por pacotes/volumes** (`volumes[]`) — você já definiu o empacotamento.

Obrigatório: **CEP origem + CEP destino + products/volumes**. Dimensões em **cm**,
peso em **kg**, valor em **R$**.

```json
{
  "from": { "postal_code": "96020360" },
  "to":   { "postal_code": "01018020" },
  "products": [
    { "id": "A", "width": 11, "height": 17, "length": 11,
      "weight": 1, "insurance_value": 10.1, "quantity": 1 }
  ],
  "options": { "receipt": false, "own_hand": false },
  "services": "1,2,18"
}
```

Resposta = array de ofertas (uma por transportadora/serviço):

```json
[
  {
    "id": 1, "name": "PAC", "price": "18.60", "custom_price": "18.60",
    "discount": "4.16", "currency": "R$", "delivery_time": 6,
    "delivery_range": { "min": 5, "max": 6 },
    "custom_delivery_time": 6,
    "custom_delivery_range": { "min": 5, "max": 6 },
    "company": { "id": 1, "name": "Correios", "picture": "..." }
  }
]
```

> ⚠️ Use **`custom_price`** e **`custom_delivery_time`** (refletem taxas/descontos da
> conta), não `price`/`delivery_time`.
> ⚠️ `insurance_value` é por **produtos**; por **pacotes** o campo chama-se `insurance`.

---

## 2) Rastreamento de pedidos

**`POST /api/v2/me/shipment/tracking`** · scope `shipping-tracking`

```json
{ "orders": ["<order_id>", "<order_id>"] }
```

Resposta = mapa `order_id → { id, protocol, status, tracking, melhorenvio_tracking,
created_at, paid_at, generated_at, posted_at, delivered_at, canceled_at, expired_at }`.

**Ciclo de vida do status:** `pending → released → generated → posted → delivered`
(+ `cancelled`, `expired`, `undelivered`, `paused`, `suspended`).

### Webhooks (rastreio em tempo real — recomendado)

Eventos com prefixo `order.`: `order.created`, `order.pending`, `order.released`,
`order.generated`, `order.received`, `order.posted`, `order.delivered`,
`order.cancelled`, `order.undelivered`, `order.paused`, `order.suspended`.

- **Autenticidade:** header `X-ME-Signature` = `HMAC-SHA256(body, app_secret)`.
- **Retry:** 5 tentativas, intervalo 15 min, timeout 6s.
- Webhook só dispara pra etiquetas geradas **pelo mesmo app** onde foi cadastrado.
- Corpo: `{ "event": "order.posted", "data": { id, protocol, status, tracking, tracking_url, ... } }`.

---

## 3) Envios e despachos (pipeline completo)

Fluxo em 4 passos:

### 3.1 Inserir no carrinho — `POST /api/v2/me/cart` · `cart-write`

```json
{
  "service": 1,
  "from": { "name": "...", "phone": "...", "email": "...", "document": "...",
            "postal_code": "...", "address": "...", "city": "...", "state_abbr": "..." },
  "to":   { "name": "...", "phone": "...", "email": "...", "document": "...",
            "postal_code": "...", "address": "...", "city": "...", "state_abbr": "..." },
  "products": [ { "id": "A", "width": 11, "height": 17, "length": 11, "weight": 1,
                  "insurance_value": 10.1, "quantity": 1 } ],
  "volumes": [ { "width": 11, "height": 17, "length": 11, "weight": 1, "insurance": 10.1 } ],
  "options": { "receipt": false, "own_hand": false, "non_commercial": true,
               "invoice": {}, "dce": {}, "tags": [] }
}
```

Resposta retorna o **`id` da etiqueta** — guarde para os passos seguintes.

### 3.2 Pagar — `POST /api/v2/me/shipment/checkout` · `shipping-checkout`

```json
{ "orders": ["<id>"] }
```

Exige saldo na carteira Melhor Envio (ou `gateway` + `redirect` para pagar na hora).
Resposta: `purchase` (id, protocol, total, status `paid`) + `orders` (cada uma com
`status: released`).

### 3.3 Gerar — `POST /api/v2/me/shipment/generate` · `shipping-generate`

```json
{ "orders": ["<id>"] }
```

Valida e comunica a transportadora. Resposta: `{ "<id>": { "status": true, "message": "Envio gerado com sucesso" } }`.
Etiqueta válida por **20 dias** após geração.

### 3.4 Imprimir — `POST /api/v2/me/shipment/print` · `shipping-print`

```json
{ "mode": "private|public", "orders": ["<id>"] }
```

Resposta: `{ "url": "https://.../imprimir/..." }`. `public` = acessível sem login
(útil pra envio reverso); `private` = exige login do usuário que gerou.

---

## Gotchas de implementação

1. **`User-Agent` obrigatório** em TODA request.
2. **Renovação de token** é mandatória (30/45 dias) — senão a integração morre sozinha.
3. **Múltiplos volumes:** Correios, J&T e Loggi **não aceitam** vários volumes em uma
   request → 1 chamada por volume.
4. **`insurance_value`** (produtos) vs **`insurance`** (pacotes) — nomes diferentes.
5. **DCe/NFe:** a partir de 06/04/2026, envios com declaração exigem `options.dce.key`.
6. **Cancelamento:** só até a transportadora ser notificada da coleta; estorno em ~12h.
7. **Sandbox:** só simula Correios/Jadlog; pagamento só Yapay (aprovado em 5 min);
   status progridem automaticamente (simula postagem/entrega).

---

**Última atualização:** 2026-09-05
**Baseado em:** docs.melhorenvio.com.br (OpenAPI v2, `llms.txt`)
