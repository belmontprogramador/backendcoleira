# IA no Contexto DDD

## 1. IA como Domain Service

No DDD, IA e um Domain Service quando contem REGRAS DE NEGOCIO que usam IA.

```typescript
// Domain Service (regra de negocio)
class FraudDetectionService {
  async analyze(order: Order): Promise<FraudRisk> {
    // IA avalia risco de fraude baseado em regras do dominio
    const result = await this.model.predict({
      amount: order.total.amount,
      customerTier: order.customerTier,
      itemCount: order.items.length,
    });
    return FraudRisk.fromScore(result.score);
  }
}
```

### Onde a IA se Encaixa no DDD
| Camada | IA como |
|--------|---------|
| Domain | Domain Service (contem regras de negocio com IA) |
| Infrastructure | API client para OpenAI, modelo self-hosted |
| Application | Use Case que orquestra chamadas ao Domain Service de IA |

## 2. RAG em Bounded Contexts

Cada Bounded Context pode ter seu proprio conhecimento indexado.

```
[Vendas] -> Knowledge Base: politicas de venda, catalogo
[Suporte] -> Knowledge Base: FAQs, troubleshooting guides
[Faturamento] -> Knowledge Base: politicas de cobranca, taxas
```

### Arquitetura RAG DDD
```typescript
// PORT (dominio)
interface DocumentSearchPort {
  search(query: string, context: BoundedContextName): Promise<Document[]>;
}

// ADAPTER (infra — pgvector/Pinecone)
class VectorSearchAdapter implements DocumentSearchPort {
  async search(query: string, context: BoundedContextName): Promise<Document[]> {
    return this.vectorDb.search(query, { filter: { context } });
  }
}

// Domain Service
class PolicyChecker {
  constructor(private docSearch: DocumentSearchPort) {}
  async checkPolicy(question: string): Promise<string> {
    const docs = await this.docSearch.search(question, 'vendas');
    return this.llm.generate(question, docs);
  }
}
```

## 3. Agents no DDD

Agentes sao orquestradores que decidem quais ferramentas usar. No DDD, podem ser Domain Services ou Use Cases complexos.

```typescript
class OrderFulfillmentAgent {
  async fulfill(order: Order): Promise<void> {
    // Decide quais steps executar baseado no estado do aggregate
    if (order.needsFraudCheck()) {
      await this.fraudService.analyze(order);
    }
    if (order.total.amount > 1000) {
      await this.manualApproval.request(order);
    }
    await this.inventory.reserve(order.items);
    await this.shipping.schedule(order);
  }
}
```

## 4. Onde a IA NÃO Entra no DDD

- Aggregate: IA nunca vai DENTRO do aggregate (lado de leitura/previsao, nao de escrita)
- Value Objects: IA pode AJUDAR a validar, mas a validacao final e deterministica
- Domain Events: IA pode GERAR eventos, mas eventos sao facts (passado, imutavel)
