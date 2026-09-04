# Plano — Integração Evolution API (WhatsApp transacional)

> **Status:** APROVADO e IMPLEMENTADO (E.2–E.4 + wiring WhatsApp + página admin QR).
> Pendente: subir a Evolution API na VPS + setar `EVOLUTION_API_URL`/`EVOLUTION_API_KEY` + conectar o QR em `/dashboard/admin`.

## 1. Objetivo

Substituir o mock `LogWhatsAppSender` por **envio real de WhatsApp** via Evolution API
(instância **única do número oficial da Elopet**), com **geração de QR code de conexão**
e **envio de mensagens** cujo teor inclui o **contato do tutor**.

## 2. Estado atual (diagnóstico)

- `WhatsAppSenderPort.sendContactMessage(to, message)` já existe em
  `src/common/ports/whatsapp-sender.port.ts`, mas **não é consumido** por nenhum use case.
- `LogWhatsAppSender` (mock dev) está wireado no `WhatsAppModule` (`@Global()`).
- A entrega de contato/scan hoje é **só por e-mail**:
  `EmailSenderPort.sendContactMessageEmail` e `sendScanAlertEmail`.
- O WhatsApp no front é **link `wa.me`** (não passa pelo backend).

## 3. Decisões aprovadas

| Decisão | Valor |
|---|---|
| Escopo | QR de conexão + `sendText`. `sendLocation` (pin nativo) = **bônus** documentado, não obrigatório. |
| Instância | **Única da Elopet** (1 número oficial). Sem instância por tutor. |
| Teor da mensagem | **Scan alert (Premium)** → WhatsApp ao tutor do número da Elopet (mensagem 1, §6). |
| Gate | Localização compartilhada continua **Premium**; o envio de WhatsApp é **meio de entrega**, não feature nova. |

## 4. Arquitetura (DIP)

Domínio/aplicação continuam dependendo só da porta `WHATSAPP_SENDER_PORT`. Nada concreto
entra no domínio.

```
application (SendContactMessageUseCase / ReportAccessLocationUseCase)
        │  depende de
        ▼
WhatsAppSenderPort (common/ports)  ←  porta (já existe)
        ▲
        │  implementa
        ▼
EvolutionWhatsAppSender (infra/whatsapp)  ──►  EvolutionApiClient (infra/whatsapp)
                                                    │ HTTP (fetch/undici)
                                                    ▼
                                            Evolution API (Baileys)
```

- **`EvolutionApiClient`** — cliente HTTP da Evolution API. Métodos: `createInstance`,
  `connect` (QR), `connectionState`, `sendText`, `sendLocation`.
- **`EvolutionWhatsAppSender`** — implementa `WhatsAppSenderPort`. Traduz
  `sendContactMessage(to, message)` → `POST /message/sendText/{instance}`.
- **`WhatsAppConnectionService`** — gera o QR (`create` + `connect`) e consulta o estado
  (`connectionState`). Usado pelo controller admin.
- **Factory real/mock** no `WhatsAppModule` (mesmo padrão do Mercado Pago): se
  `EVOLUTION_API_URL` presente → `EvolutionWhatsAppSender`; senão → `LogWhatsAppSender`.

## 5. Configuração (env)

Adicionar ao `envSchema` (`src/config/env.validation.ts`) e `.env.example`:

| Var | Exemplo | Uso |
|---|---|---|
| `EVOLUTION_API_URL` | `https://evo.elopet.online` | Base URL (sem `/` final) |
| `EVOLUTION_API_KEY` | `segredo-global` | Header `apikey` |
| `EVOLUTION_INSTANCE` | `elopet` | Nome da instância única |

## 6. Mensagens automáticas (premium)

Todas saem do **número oficial da Elopet**, restritas ao plano **Premium**.

### Mensagem 1 — scan alert (CONFIRMADA)

Quando o pingente é **escaneado**, o **tutor** recebe WhatsApp automático do número da Elopet:

> "Olá, seu cão foi achado nessa localização: 📍 https://maps.google.com/?q=lat,lng"
> (ou "localização não rastreada" quando não há GPS)

- O número de **quem escaneou NÃO entra** nessa mensagem — o scan é anônimo (sem telefone
do finder no momento do scan). Belmont confirmou isso.
- Reaproveita o gatilho/throttle do scan alert existente (`ReportAccessLocationUseCase`,
`scan-alert:{petId}`, TTL 600s, delay ~30s).
- Envio **além do e-mail** (best-effort, mesmo padrão `.catch(() => {})`).

### Mensagem 2 — formulário de contato (CONFIRMADA)

Quando quem encontrou **preenche o formulário** (e deixa os contatos), o **tutor** recebe
WhatsApp automático do número da Elopet com **as informações preenchidas**, espelhando o
e-mail de contato (`sendContactMessageEmail`):

> "🐾 Alguém encontrou seu pet {nome}:
> Nome: {senderName}
> Telefone: {senderPhone}  (se preenchido)
> Mensagem: {message}
> 📍 Localização: https://maps.google.com/?q=lat,lng"  (ou "não rastreada")

- Mesmo conteúdo e mesmo gate do e-mail de contato (`SendContactMessageUseCase`).
- Campos opcionais (telefone/email/localização) entram só quando preenchidos.
- O "contato" que entra no teor é o de **quem encontrou** (nome/telefone preenchidos no
  formulário), que chega para o tutor.

### Normalização do telefone do tutor (pré-requisito já implementado)

O `User.phone` era `string | null` sem validação/normalização. Para o envio de
WhatsApp (que exige `DDI+DDD+NÚMERO`, só dígitos), foi implementado:

- `src/common/utils/phone.ts` — `normalizeBrPhone` (→ E.164 `+55DDDnúmero`),
  `isBrMobile` (celular = `+55` + 13 dígitos), `toWhatsAppNumber` (→ Evolution,
  sem `+`, `null` se fixo/inválido) e `brPhoneSchema` (Zod: null/vazio → null,
  válido → normalizado, inválido → 400).
- **Endurecimento de input**: `register-user.schema.ts`, `update-profile.schema.ts` e
  `admin-update-user.schema.ts` passaram a usar `brPhoneSchema.optional()` (salvam
  E.164, rejeitam lixo). Decisão: NÃO criar `Phone` VO (convenção do projeto é
  `string | null`, ex. `PetContact`); normalizar na fronteira do schema + função pura.
- **Envio**: `EvolutionWhatsAppSender` usa `toWhatsAppNumber(owner.phone)`; `null`
  (sem telefone ou fixo) → **pula o WhatsApp** (o e-mail segue).

## 7. Endpoints novos (backend)

| Método/Rota | Acesso | Descrição |
|---|---|---|
| `POST /admin/whatsapp/connect` | ADMIN+ | Garante instância criada e retorna `{ base64, state }` (QR em data-URI). |
| `GET /admin/whatsapp/status` | ADMIN+ | Retorna `{ state }` (`open`/`connecting`/`close`). |

- O envio de mensagem é **interno** (chamado pelo use case de contato/scan), sem rota pública.
- Exibição do QR no painel (frontadmin) = follow-up pequeno, fora deste plano de backend.

## 8. Sub-fases

- **E.1** — Skill `skiils/evolution-api/SKILL.md` + este plano. ✅
- **E.2** — `EvolutionApiClient` (HTTP) + specs.
- **E.3** — `EvolutionWhatsAppSender` + factory real/mock no `WhatsAppModule` + specs.
- **E.4** — QR: `WhatsAppConnectionService` + controller admin (`connect`/`status`) + specs.
- **E.5** — Integrar o envio de WhatsApp no `ReportAccessLocationUseCase` (scan alert → tutor, mensagem 1 do §6) + specs.
- **E.6** — E2E (mock da Evolution API), Postman, docs (`doc-sistema`/`plano-implementacao`), `MEMORY.md`.

## 9. Testes (TDD obrigatório)

- **Unit** — `EvolutionApiClient` (HTTP mockado), `EvolutionWhatsAppSender`, `WhatsAppConnectionService`.
- **Integração** — client contra um servidor HTTP mock (não a Evolution real).
- **E2E** — flag real/mock (mock da Evolution API), `--runInBand`, sem colisão com Postgres/Redis de DEV.

## 10. Definição de Pronto (DoD)

- Teste unit → integração → implementação, na ordem.
- DIP respeitado (domínio/aplicação só veem a porta).
- `nest build` EXIT 0; testes `--runInBand` verdes.
- Postman + docs + `MEMORY.md` atualizados.

## 11. Fora de escopo (futuro)

- Webhooks (RECEBER mensagens — o envio é unidirecional).
- Grupos, envio de mídia/imagem, templates da Cloud API.
- `sendLocation` (pin nativo) — bônus.
- Instância por tutor.
