---
name: testes
description: "Testes unitários, integração, E2E, contrato e carga. Jest, Cypress, Playwright, k6, Pact, test containers. TDD, pirâmide de testes e testing DDD aggregates."
---

# Testes

Cobre todos os níveis da pirâmide de testes: unitários (Jest, mocks, testar aggregates DDD), integração (test containers, DB real), E2E (Cypress, Playwright), contrato (Pact) e carga (k6). Inclui TDD, estratégias de mock e testes em arquitetura DDD.

## Quando usar

- Escrevendo testes unitários para aggregates e value objects DDD
- Configurando testes de integração com PostgreSQL e Redis reais
- Implementando E2E com Cypress ou Playwright
- Testando contratos entre serviços (Pact)
- Executando testes de carga (k6)

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [fundamentos.md](references/fundamentos.md) | Pirâmide de testes, TDD, BDD, tipos de teste, cobertura |
| [unitarios.md](references/unitarios.md) | Jest, mocks/stubs/spies, testar aggregates DDD, value objects |
| [integracao.md](references/integracao.md) | Test containers, DB real, NestJS testing module, Redis |
| [e2e.md](references/e2e.md) | Cypress, Playwright, k6 (carga), smoke tests |
| [contrato.md](references/contrato.md) | Pact, schema validation, contrato entre serviços |
