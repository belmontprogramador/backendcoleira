# Clean Code na Pratica — Referencia Detalhada

## 1. Naming (Nomes Significativos)

```typescript
// Ruim
const d = new Date(); // d? days? date?
function proc(x: number) { } // process? procedure?

// Bom
const createdAt = new Date();
function calculateTotal(items: OrderItem[]): Money { }
```

Regras: revela intencao. Pronunciavel. Buscavel. Sem prefixos inuteis (strName, iCount). Uma palavra por conceito (sempre "fetch", nunca misturar "get", "retrieve", "load").

## 2. Funcoes Pequenas

```typescript
// Ruim: 50 linhas, 3 niveis de abstracao misturados
function processOrder(order: Order) {
  // valida
  if (!order.items.length) throw... // nivel: validacao
  // calcula desconto
  if (order.customer.isPremium) order.discount = 0.1 // nivel: negocio
  // salva
  await db.orders.save(order) // nivel: persistencia
  // envia email
  await email.send(...) // nivel: notificacao
}

// Bom: 1 nivel de abstracao por funcao
function submitOrder(order: Order) {
  validateOrderCanBeSubmitted(order);
  applyDiscounts(order);
  persistOrder(order);
  notifyCustomer(order);
}
```

Regras: pequena (5-10 linhas ideal). Um nivel de abstracao. Menos argumentos (max 2-3). Sem side effects escondidos.

## 3. Comentarios

```typescript
// ✅ Explica o PORQUE (nao o que)
// Usamos >= em vez de > porque a regra fiscal permite isencao exatamente no limite
if (order.total >= threshold) { }

// ❌ Explica o QUE (o codigo ja diz)
// Soma os itens
const total = items.reduce((sum, item) => sum + item.price, 0);

// ✅ TODO com contexto
// TODO(joao): Substituir por chamada ao TaxService quando API de impostos estiver estavel (Q3 2025)

// ❌ Comentario zumbi
// Atualizado em 2019 por Maria
```

Regras: explique o porque. Nao explique o obvio. TODO com dono + prazo. Delete codigo comentado (Git existe).

## 4. Tratamento de Erro

```typescript
// Ruim: retornar null
function findUser(id: string): User | null { }

// Bom: lancar excecao de dominio ou usar Result pattern
function findUser(id: string): User {
  const user = db.find(id);
  if (!user) throw new DomainException('USER_NOT_FOUND', `User ${id} not found`);
  return user;
}

// Result pattern (funcional)
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
function findUser(id: string): Result<User, DomainError> { }
```

Regras: excecoes, nao codigos de erro. Contexto na mensagem. Nao engula excecoes. Nao retorne null — use Optional/Result ou lance excecao.

## 5. Refatoracao (Code Smells)

**Long Method:** > 20 linhas. Extrair sub-funcoes.
**Large Class:** > 200 linhas. Quebrar em classes menores.
**Primitive Obsession:** usar `string` para Email, `number` para Money. Criar Value Objects.
**Feature Envy:** metodo usa mais dados de outra classe que da sua. Mover metodo.
**Shotgun Surgery:** mudanca pequena requer alterar 20 arquivos. Consolidar.

## 6. Boy Scout Rule
> "Deixe o codigo melhor do que encontrou."
Renomear variavel ruim. Extrair funcao longa. Adicionar teste faltante. Nao precisa refatorar tudo. So deixar melhor que estava.
