---
name: system-design-fundamentals
description: "Cache, load balancing, modelos de consistência (CAP/ACID/BASE), trade-offs e tolerância a falhas para sistemas distribuídos."
---

# Fundamentos de System Design

Cobre a teoria fundamental de sistemas distribuídos: estratégias de cache e modos de falha, algoritmos de load balancing, trade-offs arquiteturais, modelos de consistência e padrões de resiliência.

## Quando usar

- Avaliando estratégias de cache ou depurando falhas de cache
- Escolhendo algoritmos de load balancing
- Raciocinando sobre trade-offs de system design
- Explicando teorema CAP, ACID ou BASE
- Projetando sistemas tolerantes a falhas

## Fluxo

1. Identifique a preocupação específica (cache, load balancing, consistência, tolerância a falhas)
2. Carregue a referência relevante em `references/` para detalhamento profundo
3. Faça referência cruzada: a maioria das decisões de system design abrange múltiplos tópicos

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [caching.md](references/caching.md) | Camadas de cache, modos de falha, estratégias de evicção, padrões reais |
| [load-balancing.md](references/load-balancing.md) | Algoritmos L4/L7, casos de uso, health checks, persistência de sessão |
| [trade-offs.md](references/trade-offs.md) | Tensões custo/performance/confiabilidade/segurança, como navegar |
| [cap-acid-base.md](references/cap-acid-base.md) | Mergulho fundo no CAP, ACID vs BASE, modelos de consistência |
| [fault-tolerance.md](references/fault-tolerance.md) | Circuit breaker, bulkhead, retry, idempotência, detecção de falhas |
