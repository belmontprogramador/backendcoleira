Excelente documentação! Baseado nela, vou propor um **plano de implementação por fases** e o **prompt para criar o módulo de usuários completo**.

---

## 📋 PLANO DE IMPLEMENTAÇÃO POR FASES

### FASE 0 — Setup e Infraestrutura (1 semana)
```text
□ Configurar projeto NestJS + TypeScript
□ Configurar Prisma + PostgreSQL
□ Configurar Redis
□ Configurar Docker/docker-compose
□ Configurar variáveis de ambiente
□ Configurar ESLint + Prettier
□ Configurar logging estruturado
□ Configurar health checks
```

### FASE 1 — Módulo de Usuários + Autenticação ✅ CONCLUÍDA
```text
☑ Schema Prisma: User, Role, Permission, UserRole, RolePermission, AuditLog
☑ RBAC: 5 roles (USER, SUPPORT, OPERATOR, ADMIN, SUPER_ADMIN) + 20 permissões
☑ Hierarquia de roles (canManage) — ADMIN não gerencia ADMIN/SUPER_ADMIN
☑ CRUD de usuários (com regras por role) + admin endpoints
☑ Registro de usuário (client) com verificação de email
☑ Login (JWT + Refresh Token com rotação single-use + revogação em cadeia)
☑ Verificação de email (token → userId, TTL 24h)
☑ Recuperação de senha (anti-enumeração 500ms) + reset
☑ Logout + rotação de refresh token
☑ Rate limiting (Redis persistente)
☑ Auditoria (status_change, role_change)
☑ Testes: 95 unitários (23 suítes) + 19 e2e (6 suítes)
```

> 📄 Detalhes: `doc/planos/plano-usuarios.md` · Análise: `doc/refatoracao-analise/analise-module-usuario.md`

### FASE 2 — Módulo de Pets ✅ CONCLUÍDA
```text
☑ Schema Prisma: Pet, PetPrivacy, enum PetSex (relações Premium comentadas)
☑ CRUD de pets (com ownership/anti-IDOR)
☑ Modo perdido (lost/found)
☑ Privacidade (PetPrivacy — 7 flags, Basic)
☑ Upload de foto (PetStoragePort + LocalPetStorageService)
☑ Validação de ownership (IDOR) nas operações
☑ Soft delete (admin sem hard delete)
☑ Testes: 151 unitários (34 suítes) + 32 e2e (7 suítes)
```

> 📄 Detalhes: `doc/planos/plano-pets.md`

### FASE 3 — Módulo NFC/QR — Produção ✅ CONCLUÍDA
```text
☑ Schema Prisma: NfcTag (activation_code_hash, 11 estados), Batch
☑ Geração de Public ID (nanoid, sem ambíguos)
☑ Geração de Activation Code (XXXX-XXXX, hash bcrypt)
☑ Gravação NFC (write→read→compare, retry 3x) — SÓ OPERATOR
☑ Geração de QR Code (mesma URL do NFC)
☑ Lotes + produção em massa
☑ Estados do pingente (11, conforme doc-sistema)
☑ Auditoria via AuditLog (sem tabela ProductionLog separada)
☑ Testes: 213 unitários (48 suítes) + 35 e2e (8 suítes)
```

> ⚠️ `tag:record` (gravação NFC) é exclusivo de OPERATOR. ADMIN/SUPER_ADMIN não
> gravam NFC (separação de funções). Estoque/pedidos ficam na Fase 9.
> 📄 Detalhes: `doc/planos/plano-producao-nfccards.md`

### FASE 4 — Ativação + Ownership ✅ CONCLUÍDA
```text
☑ Ativação do pingente (código single-use, hash bcrypt)
☑ Validação do código de ativação
☑ Associação User ↔ Tag ↔ Pet (ownership/anti-IDOR)
☑ Transferência de pingente (token Redis TTL 7d)
☑ Desvinculação (gera novo código)
☑ Substituição (mesmo pet, só troca o hardware)
☑ Auditoria (activate/transfer/unlink/replace)
☑ Testes: 253 unitários (52 suítes) + 41 e2e (9 suítes)
```

> 📄 Detalhes: `doc/planos/plano-ativacao-owership.md`
> ⚠️ Public ID não é credencial; só o código de ativação autoriza.
> TransferToken é efêmero no Redis (não há tabela). OwnershipHistory/ActivationAttempt
> são cobertos pelo `AuditLog`.

### FASE 5 — Perfil Público ✅ CONCLUÍDA
```text
☑ Endpoint público GET /p/:publicId (rota amigável do NFC/QR)
☑ Controle de privacidade (show_phone/show_email/show_city aplicados)
☑ Exibição condicional de campos (snake_case, sem flag interna kind)
☑ Pingente virgem → "não ativado" (sem vazar dados)
☑ Pet soft-deletado → "não ativado" (não vaza dados do tutor)
☑ Cache com Redis (profile:{publicId}, TTL 300s / 60s se perdido)
☑ Invalidação de cache nos updates de pets e ownership
☑ Testes: 320 unitários (64 suítes) + 51 e2e (10 suítes)
```

> 📄 Detalhes: `doc/planos/plano-perfil-publico.md`
> ⚠️ Fora do escopo da Fase 5: Premium + PetMedical/PetContact (Fase 7),
> AccessEvent + Contact (Fase 6), Location (Fase 7), fila assíncrona (Fase 10).

### FASE 6 — Contato (Basic) + Registro de Acesso ✅ CONCLUÍDA
```text
☑ AccessEvent (registro de acesso ao perfil público — RF18)
☑ ContactMessage (mensagem do visitante → tutor — RF14)
☑ POST /p/:publicId/contact (público) + inbox do tutor (GET/PATCH /contacts)
☑ Entrega por e-mail + WhatsApp (portas, mock em dev)
☑ Rate limit (5/h IP + 10/h publicId) + anti-IDOR + IP só como hash
☑ Testes: 385 unitários (79 suítes) + 58 e2e (11 suítes)
```

> ⚠️ Escopo revisado: localização, alertas/Notification e o Feature System são
> Premium e foram movidos para a Fase 7. SMS/Push adiados. Detalhes:
> `doc/planos/plano-contato-localizacao.md`.

### FASE 7 — Planos, Assinaturas e Dados Premium ✅ CONCLUÍDA
```text
☑ 7.1 Schema: Plan, Feature, PlanFeature, Subscription, PaymentTransaction,
      WebhookEvent, PetMedical, PetContact + migration + seed (2 planos + 3 features)
☑ 7.2 Domínio: entidades + VOs (Price, SubscriptionPeriod...)
☑ 7.3 Feature system (CheckFeatureAccessUseCase + FeatureGuard 403)
☑ 7.4 Checkout próprio (PaymentGatewayPort + MercadoPagoGateway mock)
☑ 7.5 Webhook de pagamento (idempotente) + Get/Cancel Subscription + controllers
☑ 7.6 Dados Premium: PetMedical + PetContact + histórico de acessos (gateados)
☑ 7.7 E2E + Postman + encerramento
☑ Testes (unitários + integração + e2e)
```

> **Fechamento (pós-7.7):** 133 suítes / 574 unitários PASS; 12 suítes / 69 e2e PASS;
> lint/build limpos. Postman ganhou a pasta “Assinaturas e Premium (Fase 7)”.

> ⚠️ Escopo revisado (decisões D1–D10): Localização (`SharedLocation`) e Alertas
> (`Notification`) movidos para fase própria (RFs separados RF15/RF19). Só 2 planos
> (Basic/Premium). Checkout próprio (PIX/cartão/boleto), recorrência nossa (renovar =
> novo checkout por ciclo), sem fila/cron (expiração lazy), gateway mock.
> Detalhes: `doc/planos/plano-planos-assinaturas.md`.

### FASE 8 — Dashboard do Usuário (1 semana)
```text
□ Meus Pets
□ Meus Pingentes
□ Histórico de acessos
□ Notificações
□ Assinatura
□ Privacidade
□ Conta
□ Suporte
```

### FASE 9 — Admin Dashboard (1-2 semanas)
```text
□ Gestão de usuários
□ Gestão de pets
□ Gestão de pingentes
□ Gestão de produção/lotes
□ Gestão de estoque
□ Gestão de pedidos
□ Gestão de assinaturas
□ Auditoria
□ Métricas/Dashboard
```

### FASE 10 — Escalabilidade e Refinamentos (Contínuo)
```text
□ Read replicas
□ Redis cluster
□ Queue (Bull)
□ Observabilidade (logs, metrics, traces)
□ CI/CD
□ Monitoramento e alertas
□ Backup automatizado
```

---

## 🧭 ORIENTAÇÃO DE IMPLEMENTAÇÃO DAS FASES

### 1. Disciplina obrigatória — vale para TODAS as fases

Nenhuma fase começa sem respeitar as quatro regras abaixo. Elas não são sugestões;
são pré-condição de qualquer linha de código de produção.

**1.1 Teste primeiro, sempre.**
A ordem dentro de cada fase é fixa e inegociável:

```text
teste unitário  →  teste de integração  →  implementação
```

- Primeiro escrevo o teste unitário (regra de negócio, agregado, value object, caso de uso).
- Depois o teste de integração (repositório + banco real, controller + HTTP, fila).
- Só então escrevo a implementação que faz o teste passar.
- **Nenhuma implementação nasce sem teste.** Se o teste não existe, ele vem antes.
  Se já existe, eu o consulto antes de alterar qualquer comportamento.

**1.2 DIP — nunca violo.**
- Domínio e aplicação dependem **somente de abstrações** (interfaces/portas), nunca de
  implementações concretas.
- Repositórios são **portas** (`interface XxxRepository`), não classes Prisma espalhadas.
- Serviços recebem contratos por injeção. Infraestrutura (Prisma, Redis, S3, gateways)
  é plugável e mora na borda.
- Se eu encontrar uma classe dependendo de implementação concreta, eu **corrijo**,
  não contorno.

**1.3 DDD de verdade.**
- Regra de negócio vive no **domínio** (agregados, value objects, eventos de domínio),
  não espalhada em controllers e services.
- Aggregates protegem invariantes; repositórios persistem agregados inteiros;
  eventos de domínio disparam efeitos colaterais.
- Camadas: `domain → application → infrastructure → presentation`. A dependência
  aponta sempre para dentro.

**1.4 Definition of Done de cada fase.**
Uma fase só é considerada concluída quando:

```text
□ Testes unitários passando
□ Testes de integração passando
□ Regra de negócio no domínio (não no controller)
□ Dependências via abstrações (DIP respeitado)
□ Migração Prisma aplicada e revertível
□ Endpoints cobertos por teste de integração
□ Nenhum segredo/dado sensível exposto
```

### 2. Ordem e dependências entre fases

As fases têm dependência estrita. Não avançar sem fechar a anterior.

```text
FASE 0  → base de tudo (projeto, banco, cache, env, logging)
FASE 1  → identidade (User + Auth) — pré-requisito de ownership
FASE 2  → Pet (depende de User p/ ownership)
FASE 3  → NfcTag (identidade física — independe de usuário)
FASE 4  → Ativação (junta User + Pet + NfcTag)
FASE 5  → Perfil público (depende de ativação)
FASE 6  → Contato + registro de acesso (depende de perfil público)
FASE 7  → Planos/assinaturas + dados Premium (depende de features + usuário)
FASE 8  → Dashboard usuário (depende de pet, tag, assinatura)
FASE 9  → Admin (depende de tudo acima + auditoria)
FASE 10 → refino contínuo (não bloqueia entrega)
```

Regra de ouro: **a identidade é o alicerce**. User (FASE 1) e NfcTag (FASE 3) são
independentes entre si e podem ser feitos em paralelo; todo o resto depende deles.

### 3. O que NUNCA fazer

```text
□ Implementar sem teste (unitário + integração) antes
□ Depender de Prisma/Redis/S3 dentro do domínio
□ Colocar regra de negócio no controller
□ Expor dado sensível no endpoint público
□ Confiar em ID vindo do frontend sem verificar ownership
□ Avançar para a próxima fase com a anterior inacabada
```

### 4. Ritmo de entrega sugerido

```text
FASE 0 + 1 + 3  → base sólida (identidade física e lógica)
FASE 2 + 4       → vínculo pet ↔ pingente
FASE 5 + 6       → produto funcional (encontrar → contatar)
FASE 7           → monetização (Premium)
FASE 8 + 9       → operação (usuário e admin)
FASE 10          → escala (sempre ligado)
```

A cada marco, o produto já entrega valor: ao fim da FASE 6 o ciclo central
(`NFC → perfil → contato`) está funcional de ponta a ponta.

---

