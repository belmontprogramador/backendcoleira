---
name: evolution-api
description: "Referência da Evolution API (WhatsApp auto-hospedado via Baileys) — geração de QR code de conexão, gestão de instâncias e envio de mensagens (sendText/sendLocation). Base para o envio transacional de WhatsApp no Senso/Elopet."
---

# Evolution API — WhatsApp auto-hospedado

> **Fonte:** Documentação oficial — https://docs.evolutionfoundation.com.br/evolution-api
> **Versão de referência:** 2.3.7 (OpenAPI `/api-reference/openapi/Evolution-API/`)

## Conceitos Fundamentais

- **Instância (`instanceName`)** = 1 número de WhatsApp conectado. A Evolution API é
  multi-tenant: cada instância tem autenticação e estado de conexão independentes.
- **`apikey`** = token de autenticação enviado no header `apikey`. Existe uma chave
  **global** (definida em `AUTHENTICATION_API_KEY`) e, opcionalmente, um token por
  instância (definido no `create`).
- **Baileys vs Cloud API** — a Evolution suporta duas conexões:
  - `WHATSAPP-BAILEYS` — WhatsApp Web (não-oficial, gratuito). Usado no self-host.
  - Cloud API da Meta — oficial, exige conta Business + templates (mensagens fora de
    janela de 24h só com template).
- **Número de telefone** — SEMPRE `DDI + DDD + NÚMERO`, sem `+`, sem espaços.
  Brasil: `55` + DDD + 9 dígitos (ex.: `5511999999999`).
- **Delay entre mensagens** — obrigatório para não levar ban no Baileys. Usar `delay`
  de 1000–3000 ms entre envios em sequência.

## Autenticação

Todos os endpoints exigem o header:

```
apikey: <chave-global-ou-da-instancia>
```

A chave global é configurada em `AUTHENTICATION_API_KEY` (env). Para a instância única
do Elopet, usamos a chave global.

## Requisitos / Instalação

- Node.js 20+, Docker, PostgreSQL (ou MySQL), Redis.
- Env mínimas: `DATABASE_PROVIDER=postgresql`, `DATABASE_CONNECTION_URI`,
  `AUTHENTICATION_API_KEY`, Redis (`REDIS_URI`).
- Porta padrão: `8080`. Base URL: `http://localhost:8080` (dev) ou o domínio exposto
  (ex.: `https://evo.meudominio.com`).

## Endpoints (escopo do projeto)

### INSTÂNCIA

| Ação | Endpoint | Corpo / Resposta |
|---|---|---|
| Criar instância | `POST /instance/create` | `{ instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true }` → `{ instance, hash, qrcode }` |
| **Gerar QR** | `GET /instance/connect/{instanceName}` | → `{ pairingCode, code, base64, count }` |
| Status da conexão | `GET /instance/connectionState/{instanceName}` | → `{ instance: { state } }` |

**Gerar QR — exemplo:**

```bash
curl -X GET "https://evo.meudominio.com/instance/connect/elopet" \
  -H "apikey: $AUTHENTICATION_API_KEY"
```

Resposta (200):

```json
{
  "pairingCode": null,
  "code": "2@exemple",
  "base64": "data:image/png;base64,iVBORw0KGgo...",
  "count": 1
}
```

`base64` já vem como data-URI (`data:image/png;base64,...`) — pronto para `<img src>`.
O `pairingCode` só é preenchido se a instância estiver com `pairingCode: true` (parear
por código numérico em vez de QR).

**Status da conexão — exemplo:**

```bash
curl -X GET "https://evo.meudominio.com/instance/connectionState/elopet" \
  -H "apikey: $AUTHENTICATION_API_KEY"
```

```json
{ "instance": { "instanceName": "elopet", "state": "open" } }
```

`state` pode ser `open` (conectado), `connecting` (aguardando scan) ou `close`
(desconectado). Poll até `open`.

### MENSAGEM

| Ação | Endpoint | Corpo |
|---|---|---|
| **Enviar texto** | `POST /message/sendText/{instanceName}` | `{ number, text, delay? }` |
| Enviar localização (pin) | `POST /message/sendLocation/{instanceName}` | `{ number, latitude, longitude, name?, address? }` |

**Enviar texto — exemplo:**

```bash
curl -X POST "https://evo.meudominio.com/message/sendText/elopet" \
  -H "apikey: $AUTHENTICATION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "text": "Olá! 🐾",
    "delay": 1200
  }'
```

Resposta (201):

```json
{
  "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": true, "id": "3EB0..." },
  "message": { "extendedTextMessage": { "text": "Olá! 🐾" } },
  "status": "PENDING"
}
```

**Enviar localização (pin nativo) — exemplo:**

```bash
curl -X POST "https://evo.meudominio.com/message/sendLocation/elopet" \
  -H "apikey: $AUTHENTICATION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "name": "Localização",
    "address": "Rua X, 123",
    "latitude": -23.5505,
    "longitude": -46.6333
  }'
```

## Fluxo de conexão (one-time setup)

1. `POST /instance/create` com `{ instanceName: "elopet", integration: "WHATSAPP-BAILEYS", qrcode: true }`.
2. Ler `qrcode.base64` da resposta (ou chamar `GET /instance/connect/elopet`) e renderizar o QR.
3. Escanear o QR com o WhatsApp do número oficial da Elopet.
4. Poll em `GET /instance/connectionState/elopet` até `state === "open"`.
5. Depois de conectado, é só enviar mensagens via `sendText`.

## Boas práticas

1. **Delay entre mensagens** — 1000–3000 ms (`delay` no body) para não ser banido.
2. **QR expira** — o QR/pairingCode tem validade; se expirar, chame `connect` de novo.
3. **Baileys é não-oficial** — risco de ban do número; use um número dedicado, não o
   pessoal do dono.
4. **Webhooks** (fora do escopo atual) — para RECEBER mensagens, configure
   `WEBHOOK_URL`/eventos; o envio de mensagem é unidirecional (só envia).
5. **Erros** — respostas de erro seguem `{ success: false, error: { code, message } }`
   (ex.: `401 UNAUTHORIZED`, `404 NOT_FOUND`).

---

**Última atualização:** 2026-09-04
**Baseado em:** docs.evolutionfoundation.com.br (Evolution API v2.3.7)
