# Fundamentos de Testes — Referência Detalhada

## 1. A Pirâmide de Testes

```
         ╱ E2E ╲          ← Poucos. Lentos. Caminho feliz.
        ╱───────╲
       ╱Integration╲      ← Médio. Contratos, DB, APIs.
      ╱─────────────╲
     ╱   Unitários    ╲    ← MUITOS. Rápidos. Toda regra de negócio.
    ╱───────────────────╲
```

### Tempo e Custo
| Nível | Velocidade | Custo | Quantidade |
|-------|-----------|-------|------------|
| Unitário | ms | $ | 100s-1000s |
| Integração | segundos | $$ | 50-200 |
| E2E | minutos | $$$ | 10-50 |

### Regra de Ouro
> Se um teste falha, você sabe EXATAMENTE o que quebrou. Teste E2E falhou = "algo quebrou em algum lugar". Teste unitário falhou = "Order.submit() quebrou".

---

## 2. TDD (Test-Driven Development)

```
RED → GREEN → REFACTOR
  │      │        │
  │      │        └── Melhora código sem quebrar teste
  │      └── Escreve código MÍNIMO para passar
  └── Escreve teste que FALHA
```

### Quando TDD Brilha
- Lógica de negócio complexa (aggregates, value objects, domain services)
- Algoritmos puros (sem I/O)
- Regras de validação

### Quando NÃO fazer TDD
- CRUD simples (teste óbvio não adiciona valor)
- UI (teste E2E cobre melhor)
- Exploração (protótipo, spike)

---

## 3. BDD (Behavior-Driven Development)

```
DADO um cliente premium
QUANDO ele cria um pedido acima de R$ 1000
ENTÃO um desconto de 10% é aplicado
```

### Ferramentas
- **Cucumber/Gherkin:** `.feature` files. Negócio lê.
- **Jest + describe/it:** `describe('Order', () => { it('should apply discount') })`

---

## 4. Tipos de Teste

| Tipo | O que testa | Ferramenta |
|------|-------------|-----------|
| **Unitário** | Função/classe isolada | Jest, Vitest, pytest |
| **Integração** | Módulos juntos + DB real | Supertest, Testcontainers |
| **E2E** | Fluxo completo do usuário | Cypress, Playwright |
| **Contrato** | API entre serviços | Pact, OpenAPI schema |
| **Carga** | Performance sob stress | k6, Artillery, JMeter |
| **Smoke** | Sanidade pós-deploy | Script básico (health + 1 fluxo) |
| **Snapshot** | Output visual | Jest snapshots, Percy |

---

## 5. Cobertura de Código

```
Linhas: quantas linhas foram executadas?
Branches: todos os if/else foram testados?
Funções: todas as funções foram chamadas?
```

**Meta realista:** 80% em domínio. 60% em aplicação. Não persiga 100% (custo > benefício).
