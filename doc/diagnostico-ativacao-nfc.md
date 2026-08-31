# Diagnóstico — Ativação NFC: "Código de ativação inválido"

> Data: 31/08/2026 · Autor: Coleira (backend)
> Status: **diagnóstico concluído** — nenhuma alteração de código feita ainda.
> Contexto: painel "Primeiro Lote" com 15 tags (4 "Pronta" com UID, 11 "Criada").
> Ao tentar ativar a tag `28CQRKVN` com o código `28CQ-RKVN`, o sistema devolveu
> **"Código de ativação inválido"**.

---

## 1. Como o sistema gera Public ID × Activation Code

Ao criar um lote, `GenerateTagsUseCase` gera para cada tag **dois valores
independentes**:

| Campo | Exemplo | Regra | Onde vive |
|---|---|---|---|
| **Public ID** | `28CQRKVN` | 8 alfanuméricos, **sem** `0/1/I/O` | URL do perfil `/p/{publicId}` |
| **Activation Code** | `X8P4-L2Q9` | `XXXX-XXXX` aleatório, alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sem `0/1/I/O`) | criptografado no banco |

- O **Public ID não é credencial** — é o identificador público da tag (o que
  aparece na URL/QR).
- O **código de ativação é um segredo single-use**, exibido **uma única vez** no
  retorno do "gerar tags" (para impressão da etiqueta). Depois, ele só existe
  como ciphertext (`activation_code_encrypted`, AES-256-GCM, IV aleatório por
  operação → **não indexável por SQL**).

Consequência: **não dá para derivar o código a partir do Public ID.** A etiqueta
impressa contém ambos (ver `doc-sistema §producao-fabricacao §4`):

```text
ID: 28CQRKVN
CÓDIGO DE ATIVAÇÃO: X8P4-L2Q9
```

---

## 2. Causas do erro (3, independentes)

### Causa 1 — O código digitado era o Public ID, não o código de ativação

O operador digitou `28CQ-RKVN`, que é o **Public ID** `28CQRKVN` com um hífen
inserido no meio. O código de ativação é outro valor, aleatório e independente.

### Causa 2 — A tag está em `READY`, mas a ativação exige `DELIVERED`/`AVAILABLE`

A tag `28CQRKVN` foi gravada (tem UID) e está em status **`READY`** ("Pronta").
A ativação **só aceita** pingentes em `DELIVERED` ou `AVAILABLE`:

- Fluxo 1.1 (`POST /nfc/activate-by-code`): chama `listUnactivated()`, que filtra
  `owner_id = null` **E** `status IN (AVAILABLE, DELIVERED)`. Uma tag `READY`
  **não entra na lista de candidatos**.
- Fluxo 1.2 (`POST /nfc/:publicId/activate`): `READY → ACTIVE` é transição
  inválida na máquina de estados (`READY` só vai para `IN_STOCK` ou `CREATED`).

O erro é o **mesmo "Código de ativação inválido"** (`ActivationCodeMismatchError`)
porque o use case de ativação não distingue "código errado" de "status inválido"
— de propósito (não vaza quais códigos/status existem).

### Causa 3 — Lacuna de produção: não há endpoint para avançar o ciclo de vida

A máquina de estados define:

```text
CREATED → READY → IN_STOCK → SOLD → DELIVERED → AVAILABLE → ACTIVE
```

…mas **não existe nenhum endpoint/use case** para avançar
`READY → IN_STOCK → SOLD → DELIVERED → AVAILABLE`. Os métodos
`markInStock()`, `markSold()`, `markDelivered()` e `markAvailable()` existem
**apenas dentro da entidade `NfcTag`** — zero chamadas fora dela (confirmado por
grep).

As rotas `admin/tags` hoje cobrem apenas: gravar (`write`/`verify`/`report`),
reset, reprint-code, QR, list/detail. Logo, as 4 tags "Pronta" ficam presas em
`READY` e as 11 "Criada" em `CREATED` — **nenhuma consegue chegar ao status que
permite ativação**.

---

## 3. Como obter o código de ativação correto (hoje)

Recuperar o código puro sob demanda (descriptografa `activation_code_encrypted`):

```http
POST /admin/tags/28CQRKVN/reprint-code
Authorization: Bearer <JWT>
```

Permissão `tag:write` (OPERATOR / ADMIN / SUPER_ADMIN). Resposta:

```json
{ "publicId": "28CQRKVN", "code": "X8P4-L2Q9" }
```

> Mesmo com o código correto, a ativação ainda falha enquanto a tag estiver em
> `READY` (Causa 2/3).

---

## 4. O que falta corrigir (recomendação)

1. **Lacuna de produção (backend, com TDD):** implementar o avanço do ciclo de
   vida pós-gravação:
   - use cases `mark-in-stock` / `mark-sold` / `mark-delivered` / `mark-available`;
   - rotas em `admin/tags` (permissões `tag:write`/`tag:record`), respeitando a
     máquina de estados existente (as transições já estão validadas na entidade);
   - OU um único `POST /admin/tags/:publicId/advance-status` com transição validada.
2. **Painel:** botão "Reprint code" na tabela de tags (a API já existe) + botão
   de avançar status.
3. **Opcional (decisão de produto):** permitir ativação direto de `READY` para
   testes internos — **não recomendado** sem decisão explícita, pois muda a
   semântica de produção.

---

## 5. Referências (arquivos)

- `src/modules/nfc/application/use-cases/generate-tags.use-case.ts`
- `src/modules/nfc/domain/value-objects/activation-code.vo.ts`
- `src/modules/nfc/domain/value-objects/public-id.vo.ts`
- `src/modules/nfc/domain/entities/nfc-tag.entity.ts` (máquina de estados)
- `src/modules/nfc/infrastructure/repositories/prisma-nfc-tag.repository.ts` (`listUnactivated`)
- `src/modules/ownership/application/use-cases/activate-tag-by-code.use-case.ts`
- `src/modules/ownership/application/use-cases/activate-tag.use-case.ts`
- `src/modules/nfc/application/use-cases/reprint-code.use-case.ts`
- `src/modules/nfc/presentation/controllers/admin-tags.controller.ts`
