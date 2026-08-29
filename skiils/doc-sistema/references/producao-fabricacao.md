# Produção em Massa e Fabricação

## 1. Produção em Massa

O sistema deverá gerar lotes:

```text
Lote 001
Quantidade: 1.000
```

Automaticamente:

```text
1.000 Public IDs
1.000 Activation Codes
1.000 registros NfcTag
1.000 QR Codes
```

---

## 2. Gravação NFC

> **Quem grava:** a gravação física do NFC é operação de **produção**, executada
> exclusivamente pelo papel **OPERATOR** (ver `apis.md` §7 Roles). `ADMIN` e
> `SUPER_ADMIN` não gravam NFC — separação de funções.

Há **dois modos de gravação** (mesmo resultado: `CREATED → READY`):

### 2.1 Modo USB (estação fixa)

```text
PC
 ↓ USB
Leitor NFC
 ↓
Pingente
```

O software de produção (backend segura o hardware):

```text
Lê UID
 ↓
Localiza NfcTag
 ↓
Grava URL
 ↓
Lê novamente
 ↓
Valida (write → read → compare, retry 3x)
 ↓
READY
```

Endpoints: `POST /admin/tags/write` e `POST /admin/tags/verify` (`tag:record`).

### 2.2 Modo Celular / Web NFC (Android + Chrome)

Sem estação USB: o operador usa o celular (Web NFC, `NDEFReader`). O backend
**não segura o hardware** — apenas indica a próxima tag e recebe o resultado.

```text
OPERATOR login
 ↓
GET /admin/tags/next-to-write   → { publicId, url }
 ↓
Celular grava a url (NDEFReader) e lê de volta
 ↓
POST /admin/tags/report { publicId, uid, matched }
 ↓
matched=true → READY | matched=false → erro + failed_count++
```

> Web NFC só funciona em **Android + Chrome** (iPhone não grava via navegador).

### 2.3 Regravação e reimpressão

- `POST /admin/tags/:publicId/reset` (`tag:record`) — `READY → CREATED`, limpa o
  `uid`, mantém `publicId` + código (treino/regravação idempotente).
- `POST /admin/tags/:publicId/reprint-code` (`tag:write`) — devolve o código de
  ativação descriptografado (cartão).
- `POST /admin/tags/:publicId/qr` (`tag:write`) — devolve o QR em PNG (adesivo).

---

## 3. Validação

Nunca considerar gravação concluída apenas porque o comando `write` retornou sucesso.

Obrigatório:

```text
WRITE
 ↓
READ
 ↓
COMPARE
 ↓
PASS
```

Se falhar:

```text
ERROR
```

---

## 4. Etiqueta

A etiqueta da embalagem poderá conter:

```text
ID: 7F4K9M2Q

CÓDIGO DE ATIVAÇÃO:
X8P4-L2Q9

QR CODE
```

O código deve ser protegido fisicamente.

---

## 5. Escalabilidade da Fabricação

Para 1.000:

```text
gerar 1.000
 ↓
gravar 1.000
 ↓
validar 1.000
```

Para 100.000:

o processo é exatamente o mesmo.

O sistema não depende do fabricante.

A estação de produção da própria empresa pode:

```text
gerar
gravar
validar
imprimir
```

em lote.
