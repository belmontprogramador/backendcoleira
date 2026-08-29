# Produto e Identidade do Pingente

## 1. Visão do Produto

O produto é uma coleira/pingente físico contendo:

- NFC;
- QR Code;
- identificação única.

O objetivo é permitir que qualquer pessoa que encontre um pet consiga acessar seu perfil digital e entrar em contato com o tutor.

O sistema **não armazena os dados do animal dentro do NFC**.

O NFC armazena somente uma URL.

Exemplo:

```text
https://dominio.com/p/7F4K9M2Q
```

O QR Code aponta para a mesma URL.

A URL identifica o pingente no backend.

```text
NFC
  ↓
URL
  ↓
Public ID
  ↓
Backend
  ↓
Pet
  ↓
Perfil público
```

---

## 2. Princípio Central

O sistema possui três camadas distintas:

```text
┌──────────────────────────────┐
│ HARDWARE                     │
│ NFC + QR                     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ IDENTIDADE                   │
│ Public ID                    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ SOFTWARE                     │
│ Pet + Usuário + Plano + Dados│
└──────────────────────────────┘
```

O hardware é permanente.

O software é dinâmico.

---

## 3. Ciclo Completo do Produto

```text
GERAÇÃO
   ↓
GRAVAÇÃO NFC
   ↓
VALIDAÇÃO
   ↓
IMPRESSÃO QR
   ↓
ESTOQUE
   ↓
VENDA
   ↓
ENTREGA
   ↓
ATIVAÇÃO
   ↓
CADASTRO DO PET
   ↓
USO
   ↓
NFC / QR
   ↓
PERFIL PÚBLICO
```

---

## 4. Identidade do Pingente

Cada pingente terá:

### UID

Identificação física do chip NFC.

```text
04:A7:32:91:8B:XX
```

### Public ID

Identificador lógico público.

```text
7F4K9M2Q
```

### Activation Code

Código secreto de ativação.

```text
X8P4-L2Q9
```

Esses três conceitos não devem ser confundidos.

---

## 5. Requisitos do Public ID

O Public ID deve:

- ser único;
- não ser sequencial;
- não revelar informações do usuário;
- ser suficientemente grande para impedir enumeração;
- permanecer estável durante a vida do pingente.

Exemplo:

```text
7F4K9M2Q
```

Não utilizar:

```text
/pet/1
/pet/2
/pet/3
```

---

## 6. NFC

O NFC deverá armazenar um registro NDEF URI.

Exemplo:

```text
https://dominio.com/p/7F4K9M2Q
```

Não armazenar:

```text
nome
telefone
e-mail
senha
endereço
dados médicos
token JWT
```

---

## 7. QR Code

O QR Code utilizará exatamente a mesma URL:

```text
NFC
 ↓
https://dominio.com/p/7F4K9M2Q

QR
 ↓
https://dominio.com/p/7F4K9M2Q
```

Isso garante que os dois mecanismos funcionem sobre o mesmo perfil.

---

## 8. Por que não gravar os dados do pet no NFC?

Porque isso criaria vários problemas:

- necessidade de regravar o chip;
- limite de armazenamento;
- risco de dados desatualizados;
- exposição de dados pessoais;
- dificuldade de upgrade;
- dificuldade de transferência;
- impossibilidade de alterar o sistema centralmente.

Com nossa arquitetura:

```text
NFC → URL
```

e:

```text
Banco → informações atuais
```

---

## 9. Estados do Pingente

```text
CREATED
READY
IN_STOCK
SOLD
DELIVERED
AVAILABLE
ACTIVE
SUSPENDED
LOST
DEACTIVATED
RETIRED
```

Fluxo normal:

```text
CREATED
 ↓
READY
 ↓
IN_STOCK
 ↓
SOLD
 ↓
DELIVERED
 ↓
AVAILABLE
 ↓
ACTIVE
```

---

## 10. O que é um pingente virgem?

É um pingente:

```text
status = AVAILABLE
owner_id = null
pet_id = null
```

A URL já existe.

O NFC já está gravado.

O QR já existe.

Mas não existe ainda um usuário associado.

---

## Regra Absoluta do Sistema

```text
NFC = IDENTIDADE
QR  = IDENTIDADE
BACKEND = DADOS
USER = PROPRIETÁRIO
PET = ENTIDADE
PLAN = DIREITO
FEATURE = FUNCIONALIDADE
SUBSCRIPTION = PAGAMENTO
PRIVACY = CONTROLE DE EXPOSIÇÃO
```

E o fluxo fundamental permanece:

```text
NFC / QR
   ↓
PUBLIC ID
   ↓
BACKEND
   ↓
PET
   ↓
PLANO + PRIVACIDADE
   ↓
PERFIL PÚBLICO
   ↓
CONTATO / LOCALIZAÇÃO
   ↓
TUTOR
```
