---
name: estudos-de-caso
description: "Netflix, Discord, Figma, Reddit, Stripe, Uber, Amazon, WhatsApp — arquitetura real, decisões de design e lições de sistemas em escala global."
---

# Estudos de Caso

Sistemas reais em produção: como Netflix escala streaming global, Discord armazena trilhões de mensagens, Figma faz 100x no Postgres, Reddit serve 1B+ usuários, Stripe processa pagamentos com idempotência, Uber migrou de monolith, Amazon virou SOA e WhatsApp mantém milhões de conexões por servidor.

## Quando usar

- Inspiração para decisões de arquitetura
- Entendendo como empresas resolvem problemas de escala real
- Preparação para system design interviews (exemplos concretos)
- Avaliando trade-offs que outras empresas fizeram

## Referências

| Empresa | Arquivo | Destaque |
|---------|---------|----------|
| Netflix | [netflix.md](references/netflix.md) | API evolution, EVCache, GraphQL federation, CDN |
| Discord | [discord.md](references/discord.md) | Trillions de msgs, Cassandra, sharding por guild |
| Figma | [figma.md](references/figma.md) | 100x Postgres, live collaboration, PgBouncer |
| Reddit | [reddit.md](references/reddit.md) | 1B+ usuários, monolith → micro, caching |
| Stripe | [stripe.md](references/stripe.md) | Idempotency keys, API design, pagamentos |
| Uber | [uber.md](references/uber.md) | Monolith → micro, domain-oriented, geospatial |
| Amazon | [amazon.md](references/amazon.md) | SOA mandate, DynamoDB, latency = money |
| WhatsApp | [whatsapp.md](references/whatsapp.md) | Erlang, milhões de conexões/servidor, XMPP |
