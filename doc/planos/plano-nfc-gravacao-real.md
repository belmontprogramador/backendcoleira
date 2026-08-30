# PLANO: Gravação NFC real + UID automático (Revisão 3)

> Complemento do `plano-producao-nfccards.md` (Revisão 2). **Não é código** —
> é o plano para aprovação antes de mexer em qualquer arquivo.
> Alvo: resolver os 3 pontos levantados pelo Belmont (modo duplo de gravação,
> UID automático, hardware real).

---

## 1. Diagnóstico — o que existe hoje (verdade do repo)

| Peça | Estado real | Onde |
|------|-------------|------|
| **Modo USB (estação)** | Contrato pronto, **hardware é mock** (Map em memória) | `NfcWriterPort`/`NfcReaderPort` → `MockNfcWriter`/`MockNfcReader` + `MockNfcChip` |
| **Modo Celular (Web NFC)** | **Backend 100% pronto** (não segura hardware) | `GET /admin/tags/next-to-write` + `POST /admin/tags/:publicId/report` |
| **UID** | **Físico, lido do chip — nunca gerado** | `Uid` VO (`uid.vo.ts`: "Lido do hardware, não gerado pelo sistema") |
| **Front (gravação)** | Só reconhece o caminho "leitor + digitar UID"; **sem NDEFReader (Web NFC)** | `plano-integracao-frontend.md §5.5` |

**Conclusão do diagnóstico:** o backend já entregou os **dois modos** no nível de
contrato. O que falta é (a) a **implementação real do hardware USB** (adiada na
Revisão 2) e (b) a **integração Web NFC no front** (nunca foi especificada com
clareza — §5.5 misturou os dois modos num fluxo só).

### Por que o §5.5 confundiu o agente do front

O fluxo descrito era: `next-to-write` → digitar UID → `write` → `verify` → `report`.
Isso **mistura os dois modos** num único fluxo:

- `next-to-write` + `report` = **modo celular (Web NFC)** — não existe UID digitado.
- `write` + `verify` + UID digitado = **modo USB** — é o que o front implementou.

O agente seguiu a parte "USB" (com UID manual) e ignorou a parte "celular". O
erro é da **especificação**, não do agente. Corrigir o §5.5 é parte do plano.

---

## 2. As 3 questões do Belmont — entendimento correto

1. **"Combinamos leitor + celular"** — ✅ Sim. A Revisão 2 do plano já dizia
   "gravação por **USB ou celular (Web NFC)** — operador escolhe na hora", e o
   `producao-fabricacao.md §2` documenta os dois modos. O front só não recebeu
   uma especificação limpa do modo celular.
2. **"UID um por um é inviável"** — ✅ Correto, mas com uma correção conceitual
   importante: o **UID não é gerado**, ele é **lido do chip físico**. "Automático"
   significa **capturar** o UID por scan (leitor ou celular), nunca digitar. O
   sistema gera `publicId` e `activationCode`; o UID é uma propriedade do
   hardware.
3. (o plano em si, abaixo)

---

## 3. Fatos técnicos que mudam o desenho

### 3.1 O leitor USB NÃO pode ficar na VPS
A VPS/container `coleira` não tem porta USB. Um leitor físico precisa estar na
**máquina local do operador**. Logo, "backend segura o hardware" só funciona se
houver um processo local (companion) na estação. Isso é um **fork de arquitetura**
(ver §4, D1).

### 3.2 Dois tipos de "leitor" (não confundir)

| Tipo | O que faz | Custo | Grava URL? |
|------|-----------|-------|-----------|
| **Leitor só-UID** (emulação de teclado, 13.56 MHz) | Lê o UID e "digita" no campo focado | ~R$ 30–80 | ❌ não grava |
| **Leitor/gravador PC/SC** (ACR122U, PN532) | Lê UID **e** grava NDEF via driver | ~R$ 150–400 | ✅ grava |

- O leitor só-UID resolve **apenas o autofill do UID** (ponto 2 do Belmont), e
  com **zero código** (basta autofocus no campo + scan).
- Para **gravar a URL no chip** fora do celular, é preciso o PC/SC (ACR122U) +
  um processo local que fale com ele (`nfc-pcsc`, dependência nativa).

### 3.3 Web NFC (`NDEFReader`) — capacidade e limite do UID
- Funciona só em **Android + Chrome + HTTPS** (iPhone bloqueado — Core NFC exige
  app nativo).
- Grava e lê **NDEF** (a URL) — perfeito para o fluxo `next-to-write` → gravar →
  ler de volta → `report`.
- **UID via Web NFC é frágil:** `NDEFReadingEvent.serialNumber` é **experimental**
  e pode retornar **string vazia** ("empty string if no serial number is
  available"). Além disso o formato pode não casar com o `Uid` VO (6 bytes
  `XX:XX:XX:XX:XX:XX` — confirmar se o chip real é 6 ou 7 bytes).

> **Consequência:** o `report` hoje **exige** `uid`. No modo celular puro isso é
> um impeditivo (o navegador pode não dar o UID). O plano propõe tornar `uid`
> **opcional** no `report` (ver §5, Fase A).

---

## 4. Decisões para o Belmont (preciso da sua escolha)

### D1 — Modo primário de gravação (define a ordem do trabalho)
- **A.** Celular (Web NFC) como **único** caminho real; USB fica em mock até
  segunda ordem. *(recomendado: $0 de hardware, backend já pronto)*
- **B.** USB como caminho principal (exige estação + hardware + companion).
- **C.** Os dois em paralelo (maior escopo).

### D2 — Se USB: onde fica o leitor e qual hardware?
- Leitor **só-UID** (autofill barato) **+ celular para gravar** (dois toques)?
- Ou leitor/gravador **PC/SC (ACR122U)** + **processo local companion**
  (gravação completa na estação, sem celular)?
- Qual modelo de chip os pingentes usam (NTAG213/215/216?), e o UID tem
  **6 ou 7 bytes**?

### D3 — Política de UID no modo celular
- **A.** `uid` opcional no `report`; quando o `serialNumber` vier, gravar;
  senão marcar `READY` sem UID. *(recomendado)*
- **B.** Exigir UID sempre (bloqueia Web NFC puro; exigiria captura separada).
- **C.** Usar o UID só no modo USB; no celular a tag fica sem `uid` (identificada
  pela URL gravada).

---

## 5. Plano proposto (recomendado: D1=A, D3=A)

> Ordem pensada para **menor custo + menor risco**, respeitando $0/mês.

### Fase A — Backend (pequeno, desbloqueia o front)
1. `report-nfc-write.schema.ts`: `uid` vira **opcional** (mantém regex quando presente).
2. `report-nfc-write.use-case.ts`: aceita `uid?`; se ausente, marca `READY` **sem**
   UID (pular dedup por UID) — novo método de domínio `markWrittenWithoutUid()`
   (ou `markWritten(null)`).
3. `nfc-tag.entity.ts`: permitir `READY` sem `uid` (schema já tem `uid` nullable).
4. Testes unitários + integração + e2e atualizados (espelho do que já existe).
5. Atualizar `plano-integracao-frontend.md §5.2/§5.5` com `uid?` opcional.

### Fase B — Frontend (agente do front): modo celular Web NFC
1. Corrigir §5.5: **separar os dois modos** em UI distintas.
   - Modo **Celular**: "Próxima tag" → `next-to-write` → `NDEFReader.write(url)`
     → `scan()` ler de volta → `report { publicId, uid?: serialNumber, matched }`.
     Sem input de UID. Detecta `!('NDEFReader' in window)` → avisa "use Android
     + Chrome ou a estação USB".
   - Modo **USB**: mantém input UID (que no futuro vira autofill, Fase C).
2. `lib/nfc.ts`: `reportNfcWrite(publicId, { uid?, matched })`.
3. Página `/dashboard/nfc/gravar` com as duas abas (Celular | USB).

### Fase C — (opcional, se D1=B/C) USB real
1. **Autofill de UID** (barato): leitor só-UID + `autoFocus` no campo — scan digita
   o UID sozinho. Zero backend.
2. **Gravação completa na estação** (caro): processo local companion (`nfc-pcsc`)
   que expõe leitura/escrita ao browser (WebSocket) ou ao backend; `NfcModule`
   troca `MockNfcWriter`/`MockNfcReader` por um proxy para esse companion.
   Requer decidir hardware (D2) e roda **fora** da VPS.

---

## 6. Riscos / em aberto
- Formato real do UID (6 vs 7 bytes) — confirmar com o fornecedor do chip; pode
  exigir relaxar o regex do `Uid` VO.
- `serialNumber` do Web NFC inconsistente entre aparelhos → por isso `uid`
  opcional (D3-A).
- HTTPS obrigatório no domínio do painel para Web NFC (já é o caso:
  `https://painel.elopet.online`).

## 7. O que NÃO muda
- Permissões (`tag:record` só OPERATOR), RBAC, write→read→compare, retry 3x,
  auditoria, estados `CREATED → READY`, reset/reprint/QR. Tudo permanece.
