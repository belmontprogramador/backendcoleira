# Ativação e Vínculo do Pingente

## 1. Primeiro Acesso

O cliente recebe:

```text
PINGENTE
+
CÓDIGO DE ATIVAÇÃO
```

Ao encostar o celular:

```text
NFC
 ↓
URL
 ↓
GET /p/7F4K9M2Q
 ↓
backend consulta NfcTag
```

O backend verifica:

```text
status === AVAILABLE
```

Então a aplicação mostra:

> Este pingente ainda não foi ativado.

```text
[ ATIVAR PINGENTE ]
```

---

## 2. Ativação

Fluxo:

```text
Cliente
 ↓
Acessa pingente
 ↓
Sistema identifica AVAILABLE
 ↓
Login/Cadastro
 ↓
Código de ativação
 ↓
Backend valida
 ↓
Associa NfcTag ao User
 ↓
Cria/associa Pet
 ↓
ACTIVE
```

---

## 3. Código de Ativação

O código deve ser:

- aleatório;
- único;
- secreto;
- armazenado como hash;
- utilizado uma única vez.

Banco:

```text
activation_code_hash
```

Nunca:

```text
activation_code = "X8P4-L2Q9"
```

em texto puro.

---

## 4. O que acontece se alguém encontrar um pingente virgem?

A pessoa pode acessar:

```text
/p/7F4K9M2Q
```

Mas não possui:

```text
Activation Code
```

Logo:

```text
NÃO PODE ATIVAR
```

Public ID não é credencial.

---

## 5. Depois da Ativação

O estado muda:

```text
AVAILABLE
   ↓
ACTIVE
```

Agora:

```text
/p/7F4K9M2Q
```

abre o perfil público.

O código de ativação não é mais necessário.

O proprietário usa:

```text
e-mail
+
senha
```

para entrar no painel.

---

## 6. Edição dos Dados

O proprietário acessa:

```text
Dashboard
 ↓
Meus pets
 ↓
Thor
 ↓
Editar
```

Pode alterar os dados sem encostar no NFC.

Exemplo:

```text
telefone
foto
descrição
cidade
informações médicas
contatos
```

O NFC continua exatamente igual.

---

## 7. Autorização

O backend nunca confiará em:

```json
{
  "petId": "123"
}
```

enviado pelo frontend.

Deve verificar:

```text
usuário autenticado
       ↓
é proprietário?
       ↓
SIM
       ↓
autoriza
```

Se não:

```text
403 FORBIDDEN
```

---

## 8. Transferência

O proprietário poderá transferir o pingente.

```text
Usuário A
 ↓
Solicita transferência
 ↓
token temporário
 ↓
Usuário B
 ↓
aceita
 ↓
novo proprietário
```

Registrar auditoria.

---

## 9. Desvinculação

Após desvinculação:

```text
owner_id = null
pet_id = null
status = AVAILABLE
```

Mas:

**o código antigo não volta a funcionar.**

Gerar novo código.

---

## 10. Substituição do Pingente

Se o hardware quebrar:

```text
Pingente A
 ↓
desativado
 ↓
Pingente B
 ↓
mesmo Pet
```

O perfil permanece.

Histórico permanece.

Assinatura permanece.

Isso evita o cliente perder todo o cadastro.

---

## 11. Exclusão de Pet

Usar soft delete:

```text
deleted_at
```

Não destruir imediatamente registros relacionados.

---

## 12. Exclusão da Conta

Antes:

- verificar pets;
- verificar pingentes;
- verificar assinaturas;
- verificar transferências;
- aplicar política de retenção.
