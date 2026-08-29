---
name: whatsapp-wapi-api
description: "Referência completa da API W-API para WhatsApp Cloud — envio de mensagens, gestão de instâncias, grupos, contatos, webhooks e custom integration. Base para construir clones do WhatsApp Web."
---

# W-API — WhatsApp Cloud API Skill

> **Fonte:** Postman Collection `W-API Collection.postman_collection.json`
> **Base URL:** `https://api.w-api.app/v1`
> **Auth:** `Bearer {{TOKEN}}` no header `Authorization`
> **Query obrigatória:** `?instanceId={{INSTANCE_ID}}` em TODOS os endpoints
> **Modelos:** PRO (completo) e LITE (essencial). LITE é subconjunto do PRO.

---

## Conceitos Fundamentais

### Instância
Uma instância = um número de WhatsApp conectado à API. Você cria, conecta via QR Code ou OTP, e gerencia. O `instanceId` identifica qual instância está sendo usada.

### Formato de telefone
Sempre `DDI + DDD + NÚMERO` sem formatação. Ex: `559199999999`.

### Para enviar para grupos
Use o `groupId` no campo `phone` (ex: `1203633485702899787@g.us`) ou o `@lid` do destinatário para mensagens privadas.

### Delay
Toda mensagem tem `delayMessage` (1-3s default). Mensagens em sequência sem delay são rejeitadas.

### Webhooks
6 tipos de webhooks configuráveis por instância:
- **connected** — instância conectou
- **disconnected** — instância desconectou
- **delivery** — confirmação de envio (webhookDelivery)
- **received** — mensagem recebida (webhookReceived)
- **message-status** — status da mensagem (sent/delivered/read/failed)
- **chat-presence** — mudança de status do chat (composing/recording/paused)

---

## Endpoints

### 1. INSTANCE — Gerenciamento da Instância

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/instance/qr-code?instanceId=X&image=enable` | Gera QR Code (base64 ou PNG) para conectar |
| `GET` | `/instance/pairing-code?instanceId=X&phoneNumber=551199999999` | Código OTP para parear por telefone |
| `GET` | `/instance/restart?instanceId=X` | Reinicia a instância |
| `GET` | `/instance/disconnect?instanceId=X` | Desconecta o número da API |
| `GET` | `/instance/status-instance?instanceId=X` | Status de conexão da instância |
| `GET` | `/instance/fetch-instance?instanceId=X` | Dados completos da instância |
| `GET` | `/instance/device?instanceId=X` | Dados do dispositivo conectado |
| `PUT` | `/instance/update-name?instanceId=X` | Renomeia instância `{"name":"NovoNome"}` |
| `PUT` | `/instance/profile-name?instanceId=X` | Atualiza nome do perfil WhatsApp `{"name":"W-API"}` |
| `PUT` | `/instance/profile-picture?instanceId=X` | Atualiza foto do perfil `{"url":"https://..."}` |
| `PUT` | `/instance/profile-description?instanceId=X` | Atualiza descrição do perfil |
| `PUT` | `/instance/update-auto-read-message?instanceId=X` | Habilita/desabilita leitura automática de mensagens |
| `PUT` | `/instance/update-call-reject-auto?instanceId=X` | Rejeição automática de chamadas |
| `PUT` | `/instance/update-call-reject-message?instanceId=X` | Mensagem enviada ao rejeitar chamada |

---

### 2. MESSAGE — Envio de Mensagens

TODOS são `POST` com `?instanceId={{INSTANCE_ID}}`.

#### 2.1 Texto

```json
POST /message/send-text
{
  "phone": "559199999999",
  "message": "Bom dia.",
  // opcionais:
  "messageId": "MSG_ID",    // para responder
  "delayMessage": 15
}
```

#### 2.2 Imagem

```json
POST /message/send-image
{
  "phone": "559199999999",
  "image": "Link da imagem ou Base64",  // PNG, JPEG, JPG
  // opcionais:
  "caption": "",
  "messageId": "",
  "delayMessage": 15
}
```

#### 2.3 Áudio

```json
POST /message/send-audio
{
  "phone": "559199999999",
  "audio": "Link do áudio ou Base64",
  // opcionais: messageId, delayMessage
}
```

#### 2.4 Vídeo

```json
POST /message/send-video
{
  "phone": "559199999999",
  "video": "Link do vídeo ou Base64",  // MP4
  // opcionais: caption, messageId, delayMessage
}
```

#### 2.5 Sticker

```json
POST /message/send-sticker
{
  "phone": "559199999999",
  "sticker": "Link ou Base64",  // PNG, JPEG, JPG, WEBP ou GIF 512x512
  // opcionais: messageId, delayMessage
}
```

#### 2.6 GIF

```json
POST /message/send-gif
{
  "phone": "559199999999",
  "gif": "Link do video ou Base64",  // precisa ser MP4
  // opcionais: caption, messageId, delayMessage
}
```

#### 2.7 PTV (Playable Text Video)

```json
POST /message/send-ptv
{
  "phone": "559199999999",
  "ptv": "Link do video ou Base64",  // MP4
  // opcionais: messageId, delayMessage
}
```

#### 2.8 Documento

```json
POST /message/send-document
{
  "phone": "559199999999",
  "document": "Link ou Base64",
  "fileName": "documento.pdf",
  // opcionais: messageId, delayMessage
}
```

#### 2.9 Link (com preview)

```json
POST /message/send-link
{
  "phone": "559199999999",
  "message": "Acesse o site https://www.google.com",
  "linkUrl": "https://www.google.com",
  "title": "Google",
  "linkDescription": "Site de buscas",
  "image": "https://...",
  // opcionais: messageId, delayMessage
}
```

#### 2.10 Localização

```json
POST /message/send-location
{
  "phone": "559199999999",
  "name": "Google Brasil",
  "address": "Av. Brg. Faria Lima, 3477 - São Paulo - SP",
  "latitude": "-23.0696347",
  "longitude": "-50.4357913",
  // opcionais: messageId, delayMessage
}
```

#### 2.11 Contato (único)

```json
POST /message/send-contact
{
  "phone": "559199999999",
  "contactName": "Nome do Contato",
  "contactPhone": "559199999999",
  "contactBusinessDescription": "API de whatsapp"
}
```

#### 2.12 Múltiplos Contatos

```json
POST /message/send-contacts
{
  "phone": "559199999999",
  "contacts": [
    { "contactName": "W-API Cloud", "contactPhone": "559199999999", "contactBusinessDescription": "API" },
    { "contactName": "W-API", "contactPhone": "559992249708", "contactBusinessDescription": "API" }
  ],
  // opcionais: messageId, delayMessage
}
```

#### 2.13 Botões de Ação (CALL / URL / REPLY)

```json
POST /message/send-button-actions
{
  "phone": "559199999999",
  "message": "Texto da mensagem",
  "buttonActions": [
    { "type": "CALL", "buttonText": "Entrar em contato", "phone": "+559992249708" },
    { "type": "URL", "buttonText": "Visite nosso Site", "url": "https://w-api.app" },
    { "type": "REPLAY", "buttonText": "Fale com um atendente." }
  ],
  "delayMessage": 15
}
```

#### 2.14 Botões Simples (múltipla escolha)

```json
POST /message/send-button-list
{
  "phone": "559199999999",
  "message": "Deseja algo mais?",
  "buttons": [
    { "buttonId": "id1", "label": "SIM" },
    { "buttonId": "id2", "label": "NÃO" },
    { "buttonId": "id3", "label": "Voltar para o menu" }
  ],
  "delayMessage": 15
}
```

#### 2.15 Botão OTP (copia código)

```json
POST /message/send-button-otp
{
  "phone": "559199999999",
  "message": "Texto da mensagem",
  "buttonText": "Texto do botão",
  "code": "Valor a ser copiado",
  "delayMessage": 15
}
```

#### 2.16 Botão PIX

```json
POST /message/send-button-pix
{
  "phone": "559199999999",
  "merchantName": "Título exibido no botão",
  "pixKey": "Chave pix",
  "type": "CPF",  // CPF, CNPJ, PHONE, EMAIL, EVP
  "delayMessage": 15
}
```

#### 2.17 Carrossel (cards com botões)

```json
POST /message/send-carousel
{
  "phone": "559199999999",
  "message": "Deseja algo mais?",
  "cards": [
    {
      "text": "Texto do cartão",
      "image": "https://...",
      "buttonActions": [
        { "type": "CALL", "buttonText": "Entrar em contato", "phone": "+559992249708" },
        { "type": "URL", "buttonText": "Visite nosso Site", "url": "https://w-api.app" },
        { "type": "REPLAY", "buttonText": "Saber mais." }
      ]
    }
  ],
  "delayMessage": 15
}
```

#### 2.18 Lista de Opções (menu com seções)

```json
POST /message/send-list
{
  "phone": "559199999999",
  "title": "Título",
  "description": "Descrição",
  "buttonText": "Texto do Botão",
  "footerText": "Texto rodapé",
  "sections": [
    {
      "title": "Seção 01",
      "rows": [
        { "title": "Opção 1", "description": "Descrição", "rowId": "row001" },
        { "title": "Opção 2", "description": "Descrição", "rowId": "row002" }
      ]
    }
  ]
}
```

#### 2.19 Enquete

```json
POST /message/send-poll
{
  "phone": "559199999999",
  "message": "NOME_DA_ENQUETE",
  "poll": ["Opção1", "Opção2", "Opção3"],
  // opcionais:
  "pollMaxOptions": 2,
  "delayMessage": 15
}
```

#### 2.20 Reação

```json
POST /message/send-reaction
{
  "phone": "559199999999",
  "reaction": "👍",
  "messageId": "3EB011ECFA6BD9C1C9053B",
  "delayMessage": 15
}
```

#### 2.21 Remover Reação

```json
POST /message/remove-reaction
{
  "phone": "559199999999",
  "messageId": "3EB011ECFA6BD9C1C9053B",
  "delayMessage": 15
}
```

#### 2.22 Deletar Mensagem

```
DELETE /message/delete-message?phone=559199999999&messageId=3EB0CDA59F4498C42E8426&instanceId=X
```

#### 2.23 Editar Mensagem

```json
POST /message/edit-message
{
  "phone": "559999999999",
  "text": "Mensagem editada!",
  "messageId": "GG2GLL7P6QHDCDIM6U3WK"
}
```

#### 2.24 Marcar como Lida

```json
POST /message/read-message
{
  "phone": "559199999999",
  "messageId": ""
}
```

#### 2.25 Baixar Mídia

```json
POST /message/download-media
{
  "phone": "559199999999",
  "messageId": "MESSAGE_ID"
}
// Retorna URL direta da mídia nos servidores WhatsApp
```

---

### 3. CHATS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/chats/fetch-chats?instanceId=X&perPage=20&page=1` | Lista todos os chats |
| `GET` | `/chats/chat?instanceId=X&phoneNumber=559199999999` | Metadata de um chat específico |
| `POST` | `/chats/send-presence?instanceId=X` | Envia presença `{"phone":"5599...","presence":"composing","delay":15}` |

**Presence:** `composing` (digitando) ou `recording` (gravando áudio).

---

### 4. CONTACTS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/contacts/phone-exists?instanceId=X&phoneNumber=551199999999` | Verifica se número tem WhatsApp |
| `POST` | `/contacts/phone-exists-batch?instanceId=X` | Valida números em lote `{"phones":["5599...","5599..."]}` |
| `GET` | `/contacts/fetch-contacts?instanceId=X&perPage=10&page=1` | Lista todos os contatos |
| `GET` | `/contacts/profile-picture?instanceId=X&phoneNumber=5599...` | URL da foto de perfil de um contato |
| `POST` | `/contacts/modify-blocked?instanceId=X` | Bloqueia/desbloqueia `{"phoneNumber":"5599...","blockStatus":"block"}` |

**blockStatus:** `block` (bloquear) ou `unblock` (desbloquear).

---

### 5. GROUPS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/group/create-group?instanceId=X` | Cria grupo `{"groupName":"...","participants":["5599..."],"autoInvite":false}` |
| `POST` | `/group/update-group-name?instanceId=X` | `{"groupId":"120363...@g.us","groupName":"novo nome"}` |
| `POST` | `/group/update-group-photo?instanceId=X` | `{"groupId":"...","groupPhoto":"url ou base64"}` |
| `POST` | `/group/update-group-description?instanceId=X` | `{"groupId":"...","description":"..."}` |
| `POST` | `/group/add-participant?instanceId=X` | `{"groupId":"...","phones":["5599..."]}` |
| `DELETE` | `/group/remove-participant?instanceId=X` | `{"groupId":"...","phone":"5599..."}` |
| `POST` | `/group/add-admin?instanceId=X` | `{"groupId":"...","phones":["5599..."]}` |
| `POST` | `/group/remove-admin?instanceId=X` | `{"groupId":"...","phones":["5599..."]}` |
| `DELETE` | `/group/leave-group?instanceId=X&groupId=...` | Sai do grupo |
| `GET` | `/group/group-metadata?instanceId=X&groupId=...` | Dados completos do grupo |
| `GET` | `/group/group-invitation-metadata?instanceId=X&inviteUrl=...` | Dados via link de convite |
| `GET` | `/group/get-Participants?instanceId=X&groupId=...` | Lista participantes |
| `POST` | `/group/revoke-invite?instanceId=X&groupId=...` | Redefine link de convite |
| `POST` | `/group/update-group-settings?instanceId=X` | `{"groupId":"...","adminOnlyMessage":false,"adminOnlySettings":false}` |
| `GET` | `/group/get-all-groups?instanceId=X` | Lista todos os grupos e comunidades |

---

### 6. WEBHOOKS

#### 6.1 Configurar

TODOS são `PUT` com `?instanceId=X`. Enviam `{"urlWebhook": "https://meu-servidor.com/webhook"}`.

| Endpoint | Quando dispara |
|----------|----------------|
| `/webhook/update-webhook-connected` | Instância conecta |
| `/webhook/update-webhook-disconnected` | Instância desconecta |
| `/webhook/update-webhook-delivery` | Mensagem enviada com sucesso |
| `/webhook/update-webhook-received` | Mensagem recebida |
| `/webhook/update-webhook-message-status` | Status muda (sent/delivered/read/failed) |
| `/webhook/update-webhook-chat-presence` | Status do chat (digitando/gravando) |

#### 6.2 Payload de webhookReceived (mensagem de texto)

```json
{
  "event": "webhookReceived",
  "instanceId": "CYAJQL-HIIWWG-S6RU9I",
  "connectedPhone": "559992249708",
  "isGroup": false,
  "messageId": "3EB00CD0857BA22EAEDCD9",
  "fromMe": false,
  "chat": {
    "id": "559999999999",
    "profilePicture": "https://..."
  },
  "sender": {
    "id": "559999999999",
    "profilePicture": "https://...",
    "pushName": "name",
    "verifiedBizName": ""
  },
  "moment": 1749132337,
  "msgContent": {
    "extendedTextMessage": {
      "text": "teste"
    }
  }
}
```

#### 6.3 Payload de webhookReceived (imagem)

```json
{
  "event": "webhookReceived",
  "instanceId": "CYAJQL-HIIWWG-S6RU9I",
  "connectedPhone": "559992249708",
  "isGroup": false,
  "messageId": "3EB00CD0857BA22EAEDCD9",
  "fromMe": false,
  "chat": { "id": "559999999999", "profilePicture": "https://..." },
  "sender": { "id": "559999999999", "profilePicture": "https://...", "pushName": "name" },
  "moment": 1749131970,
  "msgContent": {
    "imageMessage": {
      "url": "https://...",
      "mimetype": "image/jpeg",
      "caption": "",
      "fileLength": "59583",
      "height": 445,
      "width": 959,
      "jpegThumbnail": "",
      "viewOnce": false
    }
  }
}
```

#### 6.4 Payload de webhookDelivery

Igual ao received, mas com `"event": "webhookDelivery"` e `"fromApi": true`.

#### 6.5 Logs de Webhook

| Método | Endpoint |
|--------|----------|
| `GET` | `/webhook/get-webhook-log?instanceId=X&id=LOG_ID` |
| `GET` | `/webhook/fetch-webhook-logs?instanceId=X&perPage=10&page=1` |

Logs expiram em 30 dias.

---

### 7. MESSAGE QUEUE — Fila de Mensagens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/quere/quere?instanceId=X&perPage=10&page=1` | Lista mensagens na fila |
| `DELETE` | `/quere/delete-quere?instanceId=X` | **Limpa toda a fila** |
| `DELETE` | `/quere/delete-message?instanceId=X&insertedId=ID` | Remove uma mensagem específica |

---

### 8. CUSTOM INTEGRATION — Gerenciamento Programático de Instâncias

Endpoints para criar/gerenciar instâncias sem o painel. **Auth: token master da conta (não de instância).**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/integrator/create-instance` | Cria instância PRO |
| `GET` | `/integrator/instances?pageSize=10&page=1` | Lista todas as instâncias |
| `DELETE` | `/integrator/delete-instance?instanceId=X` | Deleta instância |

#### Criar instância (body)

```json
POST /integrator/create-instance
{
  "instanceName": "Minha Instância",
  "rejectCalls": true,
  "callMessage": "Não estamos disponíveis no momento.",
  // opcionais — webhooks pré-configurados:
  "webhookConnectedUrl": "",
  "webhookDeliveryUrl": "",
  "webhookDisconnectedUrl": "",
  "webhookStatusUrl": "",
  "webhookPresenceUrl": "",
  "webhookReceivedUrl": ""
}
```

---

## DIFERENÇAS PRO vs LITE

| Recurso | PRO | LITE |
|---------|:---:|:---:|
| Texto | ✅ | ✅ |
| Imagem | ✅ | ✅ |
| Áudio | ✅ | ✅ |
| Vídeo | ✅ | ✅ |
| Documento | ✅ | ✅ |
| Localização | ✅ | ✅ |
| Contato (único) | ✅ | ✅ |
| Sticker | ✅ | ❌ |
| GIF | ✅ | ❌ |
| PTV | ✅ | ❌ |
| Link com preview | ✅ | ❌ |
| Múltiplos contatos | ✅ | ❌ |
| Botões de ação (CALL/URL/REPLY) | ✅ | ❌ |
| Botões simples | ✅ | ❌ |
| Botão OTP | ✅ | ❌ |
| Botão PIX | ✅ | ❌ |
| Carrossel | ✅ | ❌ |
| Lista de opções | ✅ | ❌ |
| Enquete | ✅ | ❌ |
| Reações | ✅ | ❌ |
| Deletar/Editar mensagem | ✅ | ❌ |
| Marcar como lida | ✅ | ❌ |
| Baixar mídia | ✅ | ✅ |
| Chats (fetch/chat/presence) | ✅ | ❌ |
| Contatos em lote | ✅ | ❌ |
| Grupos (completo) | ✅ | ✅ (parcial) |
| Fila de mensagens | ✅ | ✅ |
| Custom Integration (criar instância) | ✅ | ✅ |

---

## Padrões de uso para WhatsApp Web Clone

Para reproduzir um WhatsApp Web funcional, você precisa dominar este fluxo:

### Conexão
```
1. POST /integrator/create-instance  →  obtém instanceId + token
2. GET /instance/qr-code?image=enable  →  exibe QR code pro usuário
   OU
   GET /instance/pairing-code?phoneNumber=X  →  código OTP
3. GET /instance/status-instance  →  polling até status = "connected"
```

### Booting da UI
```
4. GET /instance/fetch-instance       → dados do perfil (nome, foto)
5. GET /contacts/fetch-contacts       → lista de contatos (agenda)
6. GET /chats/fetch-chats             → lista de conversas recentes
7. GET /instance/device               → info do dispositivo
```

### Chat em tempo real
```
8. PUT /webhook/update-webhook-received   → registra endpoint pra receber mensagens
9. Servidor recebe POST webhookReceived   → processa msgContent e roteia pro cliente
10. POST /message/send-text              → envia resposta
11. POST /chats/send-presence            → "digitando..." (composing)
12. POST /message/read-message           → ✓✓ azul
```

### Mídia
```
13. POST /message/send-image            → enviar foto/vídeo/áudio
14. POST /message/download-media        → baixar mídia recebida
```

### Grupos
```
15. GET /group/get-all-groups           → lista grupos do usuário
16. GET /group/group-metadata           → info do grupo + participantes
17. POST /group/create-group            → criar novo grupo
```

---

## Observações Importantes

1. **Rate limit:** delay de 1-3s entre mensagens; `delayMessage` controla isso
2. **Formato de grupo:** `1203633485702899787@g.us`
3. **Mensagens privadas alternativas:** use `@lid` do contato (ex: `183545595199545@lid`)
4. **Status de mensagem via webhook:** `sent → delivered → read → failed`
5. **Logs de webhook expiram em 30 dias**
6. **Planos:** LITE = apenas mensagens básicas + contatos + grupos básicos. PRO = tudo incluso.
7. **Message queue:** mensagens com erro de envio vão pra fila. Consulte com `/quere/quere`.

---

**Última atualização:** 2026-08-07
**Baseado em:** W-API Collection.postman_collection.json (14154 linhas)
