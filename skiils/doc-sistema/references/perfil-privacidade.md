# Perfil Público, Privacidade e Contato

## 1. Perfil Público

O perfil público não exige login.

Exemplo:

```text
🐶 THOR

Shih Tzu

Araruama - RJ

⚠️ PET PERDIDO

[ENTRAR EM CONTATO]

[ENVIAR LOCALIZAÇÃO]
```

---

## 2. Perfil Privado

Dados administrativos não ficam públicos.

Exemplo:

```text
senha
e-mail administrativo
subscription_id
payment data
audit logs
tokens
```

não são retornados pelo endpoint público.

---

## 3. Privacidade

Premium não significa que tudo será público.

Cada informação poderá possuir configuração:

```text
show_phone
show_email
show_medical
show_veterinarian
show_behavior
show_contacts
show_city
```

O backend deverá avaliar:

```text
Feature disponível?
        +
Usuário autorizou exposição?
        ↓
       SIM
        ↓
retorna
```

---

## 4. Dados Médicos

Estrutura:

```text
PetMedical
------------
pet_id
allergies
medications
special_care
medical_conditions
veterinarian_name
veterinarian_phone
```

Esses dados devem possuir controle de acesso.

---

## 5. Múltiplos Contatos

```text
PetContact
-----------
id
pet_id
name
phone
email
relationship
is_primary
```

Exemplo:

```text
João — Tutor
Maria — Mãe
Clínica X — Veterinário
```

---

## 6. Pet Perdido

O tutor poderá ativar:

```text
lost_status = true
```

O perfil muda para:

```text
🚨 PET PERDIDO

THOR

[ENTRAR EM CONTATO]

[ENVIAR LOCALIZAÇÃO]
```

---

## 7. Acesso de Terceiro

Quando alguém encontra o pet:

```text
NFC/QR
 ↓
perfil público
 ↓
[Entrar em contato]
```

O visitante não precisa criar conta.

Isso é fundamental.

**Não coloque fricção na recuperação do animal.**

---

## 8. Contato Privado

Em vez de obrigatoriamente expor o telefone:

```text
Visitante
 ↓
Enviar mensagem
 ↓
Backend
 ↓
Tutor
```

O sistema pode entregar via:

- e-mail;
- WhatsApp;
- SMS;
- push;
- inbox.

---

## 9. Localização

NFC não fornece GPS.

A localização só poderá ser obtida se o visitante optar por compartilhá-la.

Fluxo:

```text
Encontrou pet
 ↓
[Enviar localização]
 ↓
Permissão do navegador
 ↓
Localização
 ↓
Backend
 ↓
Tutor
```

---

## 10. Histórico de Acessos

Premium:

```text
AccessEvent
------------
id
pet_id
nfc_tag_id
source
timestamp
device_type
ip_hash
location_approx
```

Exemplo:

```text
26/08 — 14:32
Acesso via NFC
Região aproximada: Araruama/RJ
```

---

## 11. Alertas

Quando alguém acessa um pet perdido:

```text
AccessEvent
 ↓
lost = true
 ↓
Notification
 ↓
Tutor
```

Mensagem:

> Alguém acessou o perfil do seu pet.

Se a pessoa compartilhar localização:

> Seu pet pode ter sido localizado.
