# Refatoração — Gravação de Cards NFC pelo Operador (análise + plano em fases)

> **Data:** 2026-09-01
> **Escopo:** `src/modules/nfc/` (backend) — produção de cards NFC, folha A4
> PDF e gravação via celular (Web NFC).
> **Natureza:** ⚠️ **NÃO é código.** É a análise do repo + plano de refatoração
> em fases para aprovação do Belmont antes de mexer em qualquer arquivo.
>
> Complementa (não substitui) `doc/planos/plano-producao-nfccards.md` (Revisão 2)
> e `doc/planos/plano-nfc-gravacao-real.md` (Revisão 3).

## Status de implementação (backend)

- [x] **Fase 1 — Folha A4 PDF** (`GET /admin/batches/:id/sheet`): `pdfkit`, porta
  `CardSheetPdfPort`, `PdfKitCardSheetGenerator` (3×4 = 12 cards/folha, QR 4×4cm
  + código 6×2,5cm), `GenerateBatchSheetUseCase`. Validado (unit + e2e).
- [x] **Fase 2 — Reset virgem total** (`reset()` idempotente, limpa uid+owner+
  pet+ativação; `decrementWritten()` no lote). Validado.
- [x] **Fase 3 — UID opcional + 7 bytes** (`report` aceita `uid` opcional;
  `Uid` aceita 6 ou 7 bytes + normaliza hex cru do Web NFC). Validado.
- [ ] **Fase 4 — contrato do front** (não implementado; documentado no §5).

---

## 1. Resumo executivo

O módulo NFC **já entrega ~80% do pedido**. O que falta é concentrado em **duas
frentes novas** (folha A4 em PDF e reset "virgem total") e **um ajuste fino**
(UID dinâmico/opcional no Web NFC). Nada do fluxo de gravação por celular
precisa ser reescrito — ele já existe no nível de contrato
(`next-to-write` + `report`).

**Score de aderência ao pedido:** produção de lote 6/10 · gravação Web NFC 8/10.

| Frente | Estado hoje | Esforço |
|--------|-------------|---------|
| Lote + gerar códigos (1.1, 1.2) | ✅ Pronto | — |
| **Folha A4 PDF com QR + código (1.3–1.5)** | ❌ Não existe | **Médio** (novo artefato) |
| **Reset virgem total (1.6)** | 🟡 Parcial | Baixo |
| Gravação Web NFC (2.x) | 🟡 Contrato pronto, UID obrigatório | Baixo |

---

## 2. Diagnóstico — a verdade do repo hoje

### 2.1 O que já existe (e funciona)

| Peça | Onde | Observação |
|------|------|-----------|
| Criar lote (1.1) | `POST /admin/batches` → `CreateBatchUseCase` | Cria `Batch` PENDING com `quantity`, `prefix`, `external_ref` |
| Gerar códigos (1.2) | `POST /admin/batches/:id/generate` → `GenerateTagsUseCase` | Gera `publicId` + `activation_code_encrypted` (AES-256-GCM); retorna `codes` em texto **1×** |
| QR individual | `POST /admin/tags/:publicId/qr` → `GenerateQrUseCase` | PNG (300px) da URL `.../p/{publicId}` |
| Reimprimir código individual | `POST /admin/tags/:publicId/reprint-code` → `ReprintCodeUseCase` | `cipher.decrypt(...)` → código texto puro |
| Reset (1.6, parcial) | `POST /admin/tags/:publicId/reset` → `ResetTagUseCase` | `READY → CREATED`, limpa `uid`, **mantém** `publicId`+código; audita `tag_reset` |
| Próxima tag p/ gravar (2.1) | `GET /admin/tags/next-to-write?batchId=` → `GetNextTagToWriteUseCase` | Retorna `{ publicId, url }` da próxima `CREATED` |
| Reportar gravação (2.4/2.5) | `POST /admin/tags/:publicId/report` → `ReportNfcWriteUseCase` | Recebe `uid` + `matched`; marca `READY` e incrementa `written_count` |
| Listar lotes/tags (2.1) | `GET /admin/batches`, `GET /admin/tags` | Com filtro por batch/status |
| Escrita USB (station) | `POST /admin/tags/write`, `verify` | `NfcWriterPort`/`NfcReaderPort` (mock em memória) |

### 2.2 O que NÃO existe (gaps reais)

1. **Nenhum PDF.** Não há `pdfkit`/`pdfmake`/`puppeteer` no `package.json`
   (confirmado). Não há endpoint de folha, nem `qr-zip` (o `qr-zip` do plano
   original **nunca foi implementado** — o `AdminBatchesController` só tem
   list/create/detail/generate/complete/cancel).
2. **Nenhum artefato combinado QR + código.** QR (PNG) e código (reprint-code)
   são endpoints **separados e individuais**. A folha A4 que junta os dois não
   existe.
3. **`report` exige `uid` obrigatório** (`report-nfc-write.schema.ts` regex de
   6 bytes `XX:XX:...`). Web NFC (`serialNumber`) é experimental e pode vir
   vazio — impeditivo para o fluxo 2.3 "puxar UID dinamicamente".
4. **Reset não é idempotente nem "virgem total".** `reset()` só aceita
   `READY → CREATED` (joga `InvalidTagStatusTransitionError` em tag já `CREATED`
   ou em tag `ACTIVE`), limpa **só** `uid` (não `owner/pet/activated_at`), e
   **não ajusta os contadores do lote** (`written_count`).

---

## 3. Mapeamento requisito → estado

| # | Requisito | Estado | Ação necessária |
|---|-----------|--------|-----------------|
| 1.1 | Criar lote com informações | ✅ | — |
| 1.2 | "Gerar código" | ✅ | — |
| 1.3 | Folha A4: QR 4×4cm + código abaixo, layout otimizado | ❌ | **Fase 1** |
| 1.4 | Baixar PDF pelo front | ❌ | **Fase 1** |
| 1.5 | Acessar a folha de novo depois | ❌ | **Fase 1** (regenerável sob demanda) |
| 1.6 | Reset → virgem + invalidar + regravar | 🟡 | **Fase 2** |
| 2.1 | Escolher o lote a gravar | ✅ | pequeno retoque UX (Fase 3) |
| 2.2 | Gravar via Android/Chrome (Web NFC) | 🟡 | contrato pronto; front pendente |
| 2.3 | Puxar/gerar UID dinamicamente | 🟡 | **Fase 3** (uid opcional) |
| 2.4 | Verificar | ✅ | — |
| 2.5 | Gravar | ✅ | — |
| 2.6 | Próxima tag | ✅ | — |

---

## 4. Decisões

### ✅ Decisões fechadas (Belmont)

- **D1 — Layout da folha:** QR = **4×4cm**. O retângulo **2,5×6cm** é a **área
  do código de ativação** (faixa **6cm de largura × 2,5cm de altura** logo abaixo
  do QR). Célula do card ≈ **6cm × 6,5cm**.
- **D2 — Biblioteca PDF:** `pdfkit` ✅ aprovado.
- **D3 — Permissão + conteúdo:** endpoint da folha com `tag:write` (OPERATOR,
  ADMIN). **A folha deve conter os dados** — QR + código de ativação em texto.
- **D4 — Granularidade:** folha **por lote**, com **quantas páginas forem
  necessárias** (auto-paginado). Ex.: lote de 100 → todas as folhas necessárias
  para cobrir os 100 cards.
- **D5 — Reset:** **virgem total** — o operador grava e **regrava quantas vezes
  quiser**. Reset limpa `uid` + `owner` + `pet` + `activated_at`/`deactivated_at`
  e volta a `CREATED` (card em branco, reutilizável), preservando
  `publicId` + código.
- **D8 — Chip:** **NTAG215** (UID de **7 bytes**). Vou relaxar/normalizar o `Uid`
  VO para aceitar o `serialNumber` de 7 bytes (e o formato que o Web NFC
  devolver — hex sem separador, com ou sem `:`).

### ✅ Decisões fechadas (D6-A, D7-A)

> Respostas finais do Belmont: **D6-A** (decrementar `written_count`) e **D7-A**
> (`uid` opcional).

> Você não entendeu essas duas — seguem em português simples.

**D6 — O que acontece com o "contador de gravados" do lote quando você reseta
um card?**

Contexto: cada lote tem contadores internos (quantos gerados, quantos gravados,
quantos verificados, quantos falharam). Quando o operador grava um card, o
"gravados" sobe +1. Se depois ele **resetar** esse card, o card deixa de estar
gravado. A pergunta é só o que fazer com esse número:

- **Opção A (recomendada):** o "gravados" **diminui** (-1), refletindo a
  realidade de que aquele card voltou a estar em branco.
- **Opção B:** o "gravados" **não muda**, e criamos um contador novo
  `reset_count` só para rastrear "quantas vezes houve reset no lote".

É uma questão só de **estatística/relatório** — não muda o funcionamento do
reset em si.

**D7 — O UID do chip deve ser opcional na gravação por celular?**

Contexto: no fluxo por celular (Web NFC), ao encostar o card o navegador **pode
ou não** devolver o número de série (UID) do chip. Hoje o backend **obriga** a
mandar o UID.

- **Opção A (recomendada):** o UID vira **opcional**. Se o celular devolver,
  gravamos; se não devolver, gravamos mesmo assim **sem** UID. Isso destrava o
  fluxo no celular de qualquer jeito.
- **Opção B:** continuar **obrigando** o UID → o fluxo no celular **trava**
  quando o navegador não devolve o número.

Recomendo a **Opção A** nas duas. Pode responder só "D6-A e D7-A" (ou o que
preferir).

---

## 5. Plano em fases (TDD, DDD 4 camadas, DIP)

> Regras imutáveis do projeto aplicadas: teste unitário → integração → e2e →
> implementação; Zod; portas para todo o infra; testes em `__tests__/`
> co-localizada; e2e `--runInBand`; ids `cuid()`; auditoria via
> `AuditLoggerPort`.

### Fase 0 — Fechar decisões (sem código)
- Fechar **D6** e **D7**.
- Layout da folha **congelado** (ver Fase 1).

### Fase 1 — Folha A4 em PDF (requisitos 1.3, 1.4, 1.5)
**Objetivo:** gerar, sob demanda, um PDF A4 com todos os cards do lote (QR +
código), baixável e regenerável a qualquer momento.

**Layout (D1):**
- A4 retrato: 210mm × 297mm. Margens: 10mm. Área útil: **190mm × 277mm**.
- Célula do card: **60mm × 65mm** (QR 40×40mm no topo + faixa do código
  60×25mm embaixo).
- Grid: **3 colunas × 4 linhas = 12 cards por folha**.
- Lote de 100 → **9 folhas** (8 cheias + 1 com 4). Lote de N → `ceil(N/12)`.
- Por card: `pdf.image(qrPng, 40×40mm)` + código (`XXXX-XXXX`, fonte
  monoespaçada ~14pt, centralizado na faixa de 60×25mm) + `publicId` pequeno
  para conferência.

1. **Dependência:** `npm install pdfkit` + `npm install -D @types/pdfkit`
   (⚠️ sempre com `--include=dev` no ambiente da VPS para não remover
   devDependencies).
2. **Domínio — nova porta** `src/modules/nfc/domain/services/card-sheet-pdf.port.ts`:
   ```ts
   interface CardSheetPdfPort {
     generate(labels: CardSheetLabel[]): Promise<Buffer>
   }
   // CardSheetLabel = { publicId, url, code, qrPng }
   ```
   (A porta recebe dados prontos — não conhece Prisma nem cipher.)
3. **Domínio — VO de layout (opcional):** `CardSheetLayout` com margens e
   dimensões de célula em mm (parametrizável).
4. **Infra — `PdfKitCardSheetGenerator`**
   `src/modules/nfc/infrastructure/generators/pdf-kit-card-sheet.ts`:
   - Grid 3×4 (12/folha), paginação automática (múltiplas páginas).
   - Por card: imagem do QR + texto do código + `publicId`.
5. **QR em alta resolução:** estender `QrGeneratorPort.generatePng(url, opts?)`
   com `scale/size` (hoje fixo 300px; para 4cm a 300dpi ≈ 472px). Reutilizar a
   mesma lib `qrcode`.
6. **Aplicação — `GenerateBatchSheetUseCase`**
   `src/modules/nfc/application/use-cases/generate-batch-sheet.use-case.ts`:
   - `batches.findById` + `tags.listByBatch(batchId)`.
   - Para cada tag: `cipher.decrypt(code)` + `qrGen.generatePng(url, {size})`.
   - Monta `labels[]` → `sheetPdf.generate(labels)` → retorna `Buffer` + nome de
     arquivo (`lote-{name}-{n}.pdf`).
   - Audita `action: 'batch_sheet_generate'`.
   - ⚠️ Códigos **só em memória** (nunca persistidos/logados) — igual ao
     `GenerateTagsUseCase`.
7. **Presentation — endpoint**
   `GET /admin/batches/:id/sheet` em `AdminBatchesController`:
   - `@Permissions('tag:write')`.
   - `@Res()` + `res.setHeader('Content-Type', 'application/pdf')` +
     `Content-Disposition: attachment; filename="..."` + `res.send(buffer)`.
8. **Regenerabilidade (1.5):** como QR deriva de `publicId` e o código é
   recuperável via `cipher.decrypt`, o endpoint **sempre regenera** — sem
   persistir PDF nem expirar token.
9. **Testes (TDD):**
   - Unit: `generate-batch-sheet.use-case.spec.ts` (monta labels, chama porta,
     audita, erro `BatchNotFoundError`).
   - Unit: `pdf-kit-card-sheet.spec.ts` (Buffer começa com `%PDF`, nº de páginas
     = `ceil(N/12)`, lança em lista vazia).
   - e2e (`test/nfc-production.e2e-spec.ts`): OPERATOR baixa o PDF
     (`Content-Type: application/pdf`, magic bytes `%PDF`), ADMIN/SUPER_ADMIN
     recebe 403, lote inexistente 404.

### Fase 2 — Reset "virgem total" (requisito 1.6)
**Objetivo:** o operador grava e regrava quantas vezes quiser; o reset deixa o
card em branco (reutilizável), preservando `publicId` + código.

1. **Entidade `NfcTag`:**
   - Novo método de **reset administrativo** (ex.: `resetToVirgin()`): limpa
     `uid`, `ownerId`, `petId`, `activatedAt`, `deactivatedAt` → status `CREATED`.
   - Idempotente: se já `CREATED` sem dados, no-op (não lança).
   - Aceita vir de **qualquer** estado (`READY`, `AVAILABLE`, `ACTIVE`, …) — é
     um reset "forçado", não a transição normal `READY→CREATED`.
   - Mantém `publicId` + `activation_code_encrypted` **sempre** (identidade não
     se perde — é o que permite "regravar ele").
   - ⚠️ Encosta em Fase 4 (ownership): limpar `owner/pet` aqui desvincula o card
     de um pet já ativado. Como é ação do OPERATOR com `tag:record`, registrar
     auditoria completa.
2. **Aplicação `ResetTagUseCase`:**
   - Chamar o novo método `resetToVirgin()`.
   - Ajustar contador do lote conforme **D6** (decrementar `written_count` com
     piso 0, ou incrementar `reset_count`).
   - Auditar `tag_reset` com `metadata: { publicId, operatorId, previousStatus }`.
3. **Presentation:** endpoint `POST /admin/tags/:publicId/reset` já existe — só
   herda o comportamento novo.
4. **Testes (TDD):**
   - Entity: reset de `READY`/`ACTIVE`/`AVAILABLE` → `CREATED` sem uid/owner/pet;
     idempotente; identidade preservada.
   - Use case: contador do lote (D6), auditoria, `TagNotFoundError`.
   - e2e: OPERATOR grava → reset → `next-to-write` devolve a MESMA tag de novo;
     ADMIN/SUPER_ADMIN 403.

### Fase 3 — Web NFC: UID dinâmico/opcional + contexto do lote (2.1–2.6)
**Objetivo:** destravar o fluxo celular de ponta a ponta sem digitar UID.

1. **`report-nfc-write.schema.ts`:** `uid` vira **opcional** (D7). Quando
   presente, validar como **7 bytes** (NTAG215).
2. **`report-nfc-write.use-case.ts`:** aceita `uid?`; se ausente → novo método
   de domínio `markWrittenWithoutUid()` (marca `READY` **sem** `uid`, pula
   dedup por UID). Se `matched === false`, comportamento atual (falha +
   `failed_count`) permanece.
3. **`nfc-tag.entity.ts`:** `markWrittenWithoutUid()` (schema já tem `uid`
   nullable — sem migration).
4. **`uid.vo.ts` (D8):** aceitar **7 bytes** e **normalizar** o `serialNumber`
   do Web NFC (hex sem separador, com ou sem `:`, caixa alta/baixa → pad para
   `XX:XX:XX:XX:XX:XX:XX`). Atualizar spec do VO.
5. **`next-to-write` (2.1, UX):** enriquecer retorno com contexto do lote:
   `{ publicId, url, batchId, batchName, remaining }` (quantos `CREATED`
   restam no lote) — ajuda o operador a ver progresso. Exige novo método de
   contagem (ou reusar `listByBatch` + filter no use case).
6. **Testes (TDD):**
   - Entity: `markWrittenWithoutUid`.
   - VO: `uid.vo.spec.ts` — 7 bytes, normalização de `serialNumber`.
   - Use case: report sem uid marca READY; dedup de uid ignorado quando ausente;
     report com uid mantém dedup.
   - e2e: OPERATOR reporta `{ publicId, matched: true }` **sem** uid → tag READY
     sem uid; reporta com uid → READY com uid.

### Fase 4 — Validação + contrato do front (sem implementar front)
1. Backend: `npm run build` + `npm run lint` + `npm test` + `npm run test:e2e`
   (tudo verde, `--runInBand`).
2. Atualizar `doc/planos/plano-producao-nfccards.md` (novos endpoints
   `sheet`, reset virgem, uid opcional/7 bytes) e `MEMORY.md`.
3. **Contrato para o agente do front** (documentar, não implementar):
   - Página `/dashboard/nfc/gravar`: abas **Celular** (Web NFC) e **USB**.
   - Modo celular: selecionar lote → `next-to-write?batchId=` → `NDEFReader.write(url)`
     → `scan()` ler de volta → `report { publicId, uid?: serialNumber, matched }`
     → loop "próxima tag".
   - Detectar `!('NDEFReader' in window)` → aviso "use Android + Chrome".
   - Página de lote: botão **"Baixar folha (PDF)"** → `GET /admin/batches/:id/sheet`
     (download do blob). Botão **"Resetar"** no card (chama `POST .../reset`).

---

## 6. Riscos / em aberto

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| `serialNumber` do Web NFC vazio/inconsistente | Tag sem UID | D7-A (uid opcional) |
| Formato do UID (7 bytes NTAG215) | Regex rejeita scan | D8 + normalização |
| `pdfkit` fonte tipográfica do código (mono) | Alinhamento do texto | fonte built-in (Courier/Helvetica) sem asset externo |
| Códigos em texto puro durante a geração do PDF | Vazamento em log | nunca logar; só em memória; auditar acesso |
| Reset de card já ativado (Fase 4) | Desvincula dono/pet | Decisão consciente do Belmont (virgem total) + auditoria |
| Folha com lote grande (N cards) | PDF pesado/muitas páginas | paginar por grid; stream do `pdfkit` |

---

## 7. O que NÃO muda

- RBAC/permissões (`tag:record` só OPERATOR; `tag:write`/`batch:manage`/
  `tag:read`), máquina de estados do pingente (11 estados), write→read→compare,
  retry 3×, auditoria, criptografia AES-256-GCM do código, `publicId`/`ActivationCode`
  VOs, endpoints já existentes de lote/tag.
- O `Uid` VO ganha suporte a 7 bytes, mas a **semântica** (UID físico, lido do
  chip, nunca gerado) não muda.

---

## 8. Ordem de execução recomendada

```
Fase 0 (D6 + D7) → Fase 1 (PDF) → Fase 2 (reset virgem) → Fase 3 (uid opcional) → Fase 4 (validação + contrato)
```

> Fase 1 é a de maior valor percebido (o Belmont recebe os cards hoje e precisa
> da folha). Fase 2 e 3 são pequenas e podem ser feitas em sequência.
