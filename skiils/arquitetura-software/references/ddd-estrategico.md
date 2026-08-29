# DDD Estratégico — Referência Detalhada

> O DDD estratégico responde: "Qual é o domínio? Onde estão as fronteiras? Como os contextos se relacionam?"

## 1. Ubiquitous Language (Linguagem Ubíqua)

**A linguagem do negócio É a linguagem do código.** Desenvolvedores e especialistas de domínio usam os MESMOS termos.

```
Especialista: "Quando um cliente faz um pedido, reservamos o estoque."
Código:       Order.place() → Inventory.reserve()
```

**Regra:** se o negócio chama de "Pedido", a classe é `Order`, não `SalesTransactionRecord`. Se o negócio chama de "Cliente Premium", o tipo é `PremiumCustomer`, não `CustomerType.PREMIUM`. **Sem tradução. Sem gap semântico.**

### Como Construir
1. Sente com o especialista de domínio. Ouça. Anote os TERMOS que ele usa.
2. Modele usando esses termos. Mostre o modelo para ele.
3. Se ele estranhar algum nome, mude. O especialista é a autoridade.
4. Documente a linguagem (glossário compartilhado).
5. O código é a documentação viva da linguagem ubíqua.

---

## 2. Domain, Subdomains e Bounded Contexts

### O Problema: um modelo NÃO serve para tudo
`Customer` significa coisas diferentes:
- Em **Vendas:** quem compra (nome, histórico de pedidos, crédito)
- Em **Suporte:** quem abre ticket (nome, nível de SLA, tickets abertos)
- Em **Faturamento:** quem paga (CNPJ, endereço de cobrança, método de pagamento)

Um modelo UNIFICADO de Customer seria um monstro com 50 campos onde cada contexto usa 5.

### Domain (Domínio Principal)
O problema que o negócio resolve. A razão de existir da empresa.

```
E-commerce: vender produtos online
Banco: gerenciar dinheiro e transações
Healthcare: gerenciar pacientes e tratamentos
```

### Subdomains (Subdomínios)
| Tipo | Descrição | Exemplo (E-commerce) | Investimento |
|------|-----------|---------------------|-------------|
| **Core** | Diferencial competitivo. ÚNICO da empresa | Recomendação de produtos | Máximo |
| **Supporting** | Necessário mas não diferenciador | Gestão de estoque | Médio |
| **Generic** | Comum. Existe pronto no mercado | Autenticação, Pagamento | Mínimo (compre) |

**Regra de ouro:** invista pesado no Core. Compre ou terceirize Generic. Supporting é meio-termo.

### Bounded Context (Contexto Delimitado)
Fronteira EXPLÍCITA onde um modelo é válido. Dentro do contexto, os termos têm significado preciso.

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│    VENDAS            │  │    ESTOQUE            │  │    FATURAMENTO       │
│                      │  │                      │  │                      │
│ Order                │  │ InventoryItem        │  │ Invoice              │
│ Customer (comprador) │  │ Warehouse            │  │ Customer (pagador)   │
│ LineItem             │  │ StockLevel           │  │ BillingAccount       │
│ ShoppingCart         │  │ Supplier             │  │ Payment              │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

- Cada Bounded Context tem sua própria **Ubiquitous Language**.
- `Customer` em Vendas ≠ `Customer` em Faturamento. Modelos DIFERENTES.
- Cada Bounded Context = um time, um deploy, um DB (idealmente).

---

## 3. Context Map (Mapa de Contextos)

Define COMO os Bounded Contexts se relacionam.

### Padrões de Relacionamento

**Partnership (Parceria)**
```
[Vendas] ←────→ [Estoque]
```
Times colaboram. Coordenação informal. Interface evolui junto.

**Customer/Supplier (Cliente/Fornecedor)**
```
[Vendas] ──→ [Faturamento]
(cliente)     (fornecedor)
```
Vendas (downstream/cliente) depende de Faturamento (upstream/fornecedor). Fornecedor dita o contrato.

**Conformist (Conformista)**
```
[Nosso Sistema] ──→ [Sistema Legado do Governo]
```
Downstream se conforma ao modelo do upstream. Sem tradução. "É o que é."

**Anticorruption Layer (ACL — Camada Anticorrupção)**
```
[Vendas] ──ACL──→ [Sistema Legado]
```
Traduz modelos entre contextos. Protege o domínio nobre de ser corrompido por modelos externos.

```typescript
// ACL: Vendas não contamina seu modelo com o legado
class LegacyInventoryAdapter implements InventoryPort {
  constructor(private readonly legacyClient: LegacyERPClient) {}

  async reserve(items: OrderItem[]): Promise<void> {
    // Traduz OrderItem (Vendas) → formato do legado
    const legacyFormat = items.map(i => ({
      codigo_produto: i.productId,        // tradução!
      quantidade_reservada: i.quantity,   // tradução!
    }));
    await this.legacyClient.reservarEstoque(legacyFormat);
  }
}
```

**Shared Kernel (Núcleo Compartilhado)**
```
[Vendas] ──Shared── [Faturamento]
         Kernel
```
Compartilham parte do modelo. **Use com cuidado.** Mudança no Shared Kernel quebra ambos. Prefira ACL ou eventos.

**Open Host Service (Serviço Hospedeiro Aberto)**
```
[Múltiplos Downstream] ──→ [Open Host API]
```
Contexto expõe API bem documentada (REST, gRPC) para múltiplos consumidores.

**Published Language (Linguagem Publicada)**
```
[Vendas] ──Eventos (JSON Schema)──→ [Estoque, Faturamento, Notificações]
```
Schema de eventos/API é publicado e versionado. Downstreams consomem.

---

## 4. Event Storming (Ferramenta de Descoberta)

Workshop colaborativo para descobrir o domínio. Post-its em uma parede (física ou Miro).

### Cores e Significados
| Cor | Elemento | Pergunta |
|-----|----------|----------|
| 🟠 Laranja | **Domain Event** | O que acontece? "Pedido Enviado" |
| 🔵 Azul | **Command** | O que dispara? "Enviar Pedido" |
| 🟡 Amarelo | **Aggregate** | Onde a decisão é tomada? "Pedido" |
| 🟣 Roxo | **Policy / Reactor** | O que reage? "Quando Pedido Enviado → Notificar Cliente" |
| 🟢 Verde | **Read Model** | O que é consultado? "Pedidos Pendentes" |
| 🔴 Rosa | **External System** | O que é externo? "Gateway de Pagamento" |
| ⚪ Branco | **Hotspot** | Pergunta em aberto. "Como lidar com estorno?" |

### Fluxo do Workshop
1. **Brainstorming:** todos colam Domain Events (laranja) na timeline. Sem ordem. Caos criativo.
2. **Timeline:** organizar eventos em ordem cronológica.
3. **Commands:** quem dispara cada evento?
4. **Aggregates:** onde as decisões acontecem?
5. **Policies:** reações automáticas a eventos.
6. **Read Models:** o que precisa ser consultado?
7. **Bounded Contexts:** agrupar aggregates relacionados. Surge a fronteira.

---

## 5. Exemplo Completo: E-commerce

### Context Map
```
                   ┌─────────────┐
    Parceria       │   ESTOQUE   │
  ┌────────────────┤             │
  ▼                └─────────────┘
┌──────────┐       ┌─────────────┐
│  VENDAS  │──CS──→│ FATURAMENTO │
│  (Core)  │       └─────────────┘
└──────────┘       ┌─────────────┐
  │   │            │  NOTIFICAÇÕES│
  │   └──PL/ACL──→│  (Supporting)│
  │                └─────────────┘
  └──PL──→ [Gateway Pagamento] (Generic — compre!)
```

### VENDAS (Core Domain — Máximo Investimento)
```
Bounded Context: Vendas
Ubiquitous Language: Order, Customer, ShoppingCart, LineItem, Checkout
Modelos: Order (Aggregate), Money (VO), OrderId (VO)
Eventos: OrderPlaced, OrderCancelled, ItemAddedToCart
```

### ESTOQUE (Supporting — Médio Investimento)
```
Bounded Context: Estoque
Ubiquitous Language: InventoryItem, Warehouse, StockLevel, Reservation
Eventos: StockReserved, StockReleased, LowStockAlert
```

### FATURAMENTO (Supporting)
```
Bounded Context: Faturamento
Ubiquitous Language: Invoice, BillingAccount, Payment, TaxDocument
```

### PAGAMENTO (Generic — Compre!)
```
Stripe/PagSeguro/MercadoPago. Não desenvolva.
```
