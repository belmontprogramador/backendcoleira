---
name: doc-sistema
description: "Documentação mestre do sistema Coleira Cachorro: identidade NFC/QR, ativação, planos/assinaturas, modelo de dados, APIs, segurança, infraestrutura e arquitetura NestJS."
---

# Documentação do Sistema — Coleira Digital NFC + QR

Documento mestre do projeto `coleira-cachorro`. Cobre o produto de ponta a ponta: identidade do pingente (NFC + QR + Public ID), ativação e ciclo de vida, perfil público/privado, planos (Basic/Premium) e features, assinaturas, modelo de dados, APIs, requisitos e regras de negócio, segurança, infraestrutura e arquitetura.

**Stack:** NestJS + TypeScript, PostgreSQL (Prisma), Redis, S3/R2, JWT + Refresh Token, Modular Monolith / Clean Architecture.

## Quando usar

- Entendendo o funcionamento geral do produto ou tomando decisões de design
- Modelando o domínio (entidades, estados do pingente, relações)
- Implementando ativação, transferência ou ciclo de vida do pingente
- Definindo planos, features e assinaturas
- Desenhando APIs, autorização e privacidade
- Planejando infraestrutura, cache, escalabilidade ou resiliência

## Fluxo

1. Identifique a área do sistema em questão (produto, ativação, perfil, planos, dados, APIs, requisitos, segurança, infra ou arquitetura)
2. Carregue a referência relevante em `references/` para detalhamento
3. Considere as interseções: identidade define o fluxo de ativação, plano define features, privacidade define o que o perfil público expõe

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [produto-identidade.md](references/produto-identidade.md) | Visão do produto, 3 camadas (hardware/identidade/software), UID vs Public ID vs Activation Code, NFC/QR, estados do pingente, pingente virgem, regra absoluta |
| [ativacao.md](references/ativacao.md) | Primeiro acesso, ativação, código de ativação (hash/single-use), autorização, transferência, desvinculação, substituição, exclusão de pet/conta |
| [perfil-privacidade.md](references/perfil-privacidade.md) | Perfil público vs privado, privacidade, dados médicos, múltiplos contatos, pet perdido, contato privado, localização, histórico, alertas |
| [planos-assinaturas.md](references/planos-assinaturas.md) | Basic vs Premium, feature system, Subscription, status, compra, webhook, idempotência, downgrade/upgrade |
| [modelo-de-dados.md](references/modelo-de-dados.md) | Entidades: User, Pet, NfcTag, PetPrivacy, PetMedical, PetContact, Feature, Subscription, WebhookEvent, AccessEvent, AuditLog, InventoryItem, Order |
| [apis.md](references/apis.md) | Autenticação, API de pingentes, pets, pública, assinatura, administrativa e roles |
| [requisitos-regras.md](references/requisitos-regras.md) | RF01–RF34, RNF01–RNF10, RB01–RB28 |
| [seguranca.md](references/seguranca.md) | IDOR, rate limit, proteção do código de ativação, testes críticos de segurança |
| [infraestrutura.md](references/infraestrutura.md) | Redis, cache do perfil, filas, storage, processamento de imagem, escalabilidade, resiliência, métricas |
| [producao-fabricacao.md](references/producao-fabricacao.md) | Produção em massa, gravação NFC, validação (write/read/compare), etiqueta, escalabilidade da fabricação |
| [arquitetura.md](references/arquitetura.md) | Estrutura NestJS, arquitetura interna (camadas), dashboards, testes, fluxos completos, decisão arquitetural, arquitetura final |
