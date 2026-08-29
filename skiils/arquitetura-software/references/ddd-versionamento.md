# Versionamento de Modelos DDD

## 1. Por que Versionar?

Modelos de dominio EVOLUEM. Eventos tem schema. Sem versionamento = breaking changes silenciosas.

## 2. SemVer para Modelos DDD

**MAJOR:** mudanca incompativel (renomear aggregate, remover campo obrigatorio de VO, mudar tipo de ID).
**MINOR:** adicao backward-compatible (novo campo opcional, novo Domain Event, novo metodo).
**PATCH:** correcao sem impacto (bug fix, invariante ajustada).

## 3. Event Versioning

**Schema Version no Evento:** `{ "schemaVersion": "2.0", ... }`. Handler verifica e aplica logica correta.

**Upcaster:** transforma V1 -> V2 antes do handler. Eventos antigos sao "upgraded" transparentemente.

**Weak Schema:** campos novos tem default. Consumidores ignoram desconhecidos.

**Novo Tipo de Evento:** `OrderSubmittedV2` coexiste com `OrderSubmitted`. Sem modificar existente.

## 4. Conventional Commits DDD
```
feat(orders): adiciona cancelamento parcial ao Order
fix(inventory): corrige invariante de StockLevel
BREAKING CHANGE(orders): submit() requer PaymentMethod
```

## 5. CHANGELOG do Modelo
```markdown
## [Orders 2.1.0] - 2025-01-15
### Added - cancelamento parcial, OrderPartiallyCancelled
### Changed - submit() requer PaymentMethod (BREAKING)
### Fixed - total nunca negativo apos remover item
```
