# Arquitetura do Sistema

## 1. Estrutura do Projeto NestJS

```text
coleira-cachorro/
│
├── src/
│   │
│   ├── auth/
│   ├── users/
│   ├── pets/
│   ├── nfc/
│   ├── activation/
│   ├── ownership/
│   ├── public-profile/
│   ├── privacy/
│   ├── plans/
│   ├── features/
│   ├── subscriptions/
│   ├── payments/
│   ├── webhooks/
│   ├── notifications/
│   ├── lost-pet/
│   ├── access-events/
│   ├── production/
│   ├── batches/
│   ├── inventory/
│   ├── orders/
│   ├── storage/
│   ├── admin/
│   ├── audit/
│   ├── support/
│   └── common/
│
├── prisma/
│   └── schema.prisma
│
├── test/
├── Dockerfile
├── docker-compose.yml
├── .env
└── package.json
```

---

## 2. Arquitetura Interna

```text
Controller
    ↓
Application
    ↓
Domain
    ↓
Repository
    ↓
Infrastructure
```

Exemplo:

```text
ActivateTagController
        ↓
ActivateTagUseCase
        ↓
ActivationService
        ↓
NfcTagRepository
        ↓
Prisma
        ↓
PostgreSQL
```

---

## 3. Testes

### Unitários

Testar:

- ativação;
- ownership;
- planos;
- features;
- privacidade;
- assinatura;
- transferência;
- pet perdido.

### Integração

```text
API
+
PostgreSQL
+
Redis
```

### E2E

Testar o ciclo inteiro:

```text
produção
 ↓
ativação
 ↓
pet
 ↓
NFC
 ↓
QR
 ↓
Basic
 ↓
Premium
 ↓
pet perdido
 ↓
contato
 ↓
localização
```

---

## 4. Dashboards

### Dashboard do Usuário

```text
Dashboard
│
├── Meus Pets
├── Meus Pingentes
├── Histórico
├── Notificações
├── Assinatura
├── Privacidade
├── Conta
└── Suporte
```

### Dashboard do Pet

```text
Thor
│
├── Perfil
├── Informações
├── Foto
├── Contatos
├── Informações médicas
├── Privacidade
├── Pet perdido
├── Histórico
└── Pingente
```

Recursos devem aparecer conforme o plano.

### Dashboard Administrativo

```text
Admin
│
├── Usuários
├── Pets
├── Pingentes
├── Produção
├── Lotes
├── Estoque
├── Pedidos
├── Assinaturas
├── Eventos
├── Notificações
├── Suporte
└── Auditoria
```

---

## 5. Fluxo Completo — Cliente

```text
Compra
 ↓
Recebe coleira
 ↓
Recebe código
 ↓
Encosta celular
 ↓
Sistema detecta pingente virgem
 ↓
Ativação
 ↓
Login/Cadastro
 ↓
Código
 ↓
Associação
 ↓
Cadastro do pet
 ↓
Perfil publicado
 ↓
Dashboard
```

---

## 6. Fluxo Completo — Pessoa que encontra o pet

```text
Encontra cachorro
 ↓
NFC ou QR
 ↓
URL pública
 ↓
Perfil
 ↓
Identifica animal
 ↓
Contato
 ↓
Localização opcional
 ↓
Tutor recebe alerta
```

**Sem login.**

---

## 7. Fluxo Completo — Premium

```text
Usuário Basic
 ↓
Escolhe Premium
 ↓
Checkout
 ↓
Pagamento
 ↓
Webhook
 ↓
Subscription ACTIVE
 ↓
Entitlements atualizados
 ↓
Novos recursos liberados
```

Nenhuma alteração física no produto.

---

## 8. Fluxo Completo — Pingente perdido

```text
Tutor
 ↓
Dashboard
 ↓
Bloquear/desativar
 ↓
Pingente não pode ser utilizado
```

Posteriormente:

```text
novo pingente
 ↓
associar ao pet existente
```

---

## 9. Fluxo Completo — Pingente quebrado

```text
Pingente A
 ↓
Replacement
 ↓
Pingente A RETIRED
 ↓
Pingente B
 ↓
mesmo Pet
 ↓
mesmo perfil
```

---

## 10. Principal Decisão Arquitetural

A URL do pingente é permanente.

Exemplo:

```text
https://dominio.com/p/7F4K9M2Q
```

O que muda é:

```text
Owner
Pet
Plan
Features
Privacy
Lost status
Contacts
Medical data
```

Não muda:

```text
Public ID
URL
NFC
QR
```

---

## 11. Resultado

A plataforma deixa de ser simplesmente:

> "uma coleira com NFC."

Ela passa a ser:

> **uma plataforma de identidade digital permanente para pets.**

O hardware é a porta de entrada.

O backend é o cérebro.

O perfil público é o serviço principal.

O Premium é a camada de monetização recorrente.

E o sistema fica preparado para evoluir posteriormente para:

```text
Pet Shop
Clínicas veterinárias
ONGs
Seguradoras
White Label
API B2B
Marketplace
Múltiplos pets
Planos família
```

---

## 12. Arquitetura Final

```text
                         ┌──────────────────┐
                         │     USUÁRIO      │
                         └────────┬─────────┘
                                  │
                            Dashboard
                                  │
                                  ▼
┌─────────────┐           ┌──────────────────┐
│ NFC + QR    │──────────▶│     BACKEND      │
└─────────────┘           │     NestJS       │
                          └────────┬─────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
       PostgreSQL                Redis                Storage
             │                     │                     │
             ▼                     ▼                     ▼
          Usuários               Cache                Fotos
          Pets                   Queue
          Tags                   Rate limit
          Plans
          Subscriptions
          Events
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                  ▼                ▼                ▼
               Payment          E-mail          WhatsApp
               Gateway          /Push            /SMS
```
