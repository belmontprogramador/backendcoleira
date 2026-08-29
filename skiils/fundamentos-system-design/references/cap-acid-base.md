# CAP, ACID, BASE — Referência Detalhada

## 1. Teorema CAP — A Lei da Física dos Sistemas Distribuídos

Proposto por Eric Brewer em 2000, formalizado por Gilbert e Lynch em 2002. É o teorema mais famoso (e mais mal-entendido) de sistemas distribuídos.

### Os 3 Pilares

#### C — Consistency (Consistência)
- Toda leitura recebe o valor da escrita mais recente (ou um erro)
- Todos os nós do sistema veem os mesmos dados no mesmo momento
- Se você escreveu e recebeu confirmação, qualquer leitura subsequente (de qualquer nó) DEVE retornar esse valor
- Não é "consistência eventual" — é consistência forte, linearizável
- **Analogia:** conta bancária — se você transferiu dinheiro e viu o novo saldo, ninguém mais pode ver o saldo antigo

#### A — Availability (Disponibilidade)
- Toda requisição (de um nó funcional) recebe uma resposta — sem erro
- O sistema SEMPRE responde, mesmo que seja com dados potencialmente stale
- Um nó não pode recusar requisições enquanto o sistema estiver particionado
- **Analogia:** busca no Google — se um datacenter está offline, você ainda recebe resultados (talvez ligeiramente desatualizados)

#### P — Partition Tolerance (Tolerância a Partições)
- O sistema continua funcionando mesmo quando a rede entre os nós falha (mensagens são perdidas ou atrasadas)
- Partições de rede são inevitáveis em sistemas distribuídos: switches falham, cabos rompem, latência explode
- Um sistema que NÃO tolera partições é um sistema single-node (onde "partição" é o nó inteiro cair)

### O "Escolha 2" — E o Mal-Entendido

**A versão simplificada:**
> Você só pode ter 2 dos 3. Escolha entre CA, CP, ou AP.

**A realidade:**
- Em sistemas distribuídos, **partições são inevitáveis**. Você NÃO pode escolher "não ter partições".
- A escolha real é: **durante uma partição de rede, você sacrifica Consistência ou Disponibilidade?**
- Quando não há partição, você pode ter ambos (C + A)
- Portanto, a escolha é entre **CP** e **AP**

#### CP — Consistency + Partition Tolerance (Sacrifica Disponibilidade)
- Durante uma partição, o sistema prefere retornar erro a retornar dado inconsistente
- **Casos de uso:** sistemas financeiros, controle de inventário, qualquer coisa onde dado errado > sem resposta
- **Exemplos:** ZooKeeper, etcd, HBase, MongoDB (configurado com write concern "majority")
- **Comportamento sob partição:** nós minoritários ficam indisponíveis até a partição ser resolvida

#### AP — Availability + Partition Tolerance (Sacrifica Consistência)
- Durante uma partição, o sistema retorna dados (potencialmente stale) em vez de erro
- **Casos de uso:** redes sociais, CDNs, catálogos de produto, sistemas onde "responder algo" > "não responder"
- **Exemplos:** Cassandra, DynamoDB (eventual), Riak, CouchDB
- **Comportamento sob partição:** todos os nós continuam aceitando leituras e escritas; conflitos resolvidos depois

### Exemplo Concreto: Banco de Dados com 3 Nós e Partição

**Situação inicial (sem partição):**
```
  Client → [Nó1 (líder)] ← sync → [Nó2] ← sync → [Nó3]
```
Tudo funciona: escritas no líder, replicadas, leituras consistentes.

**Partição acontece:** Nó1 perde conexão com Nó2 e Nó3.
```
  Client → [Nó1] ----X---- [Nó2] ← sync → [Nó3]
```

**Estratégia CP:**
- Nó1 (isolado) percebe que não tem quórum → recusa escritas e leituras (retorna erro)
- Nó2+Nó3 (maioria) elegem novo líder → continuam processando
- Sistema permanece consistente, mas cliente do Nó1 recebe erro

**Estratégia AP:**
- Nó1 continua aceitando escritas (com timestamp)
- Nó2+Nó3 continuam aceitando escritas
- Quando a partição se resolve, o sistema faz merge de escritas conflitantes (last-write-wins, CRDTs, ou resolução customizada)
- Sistema sempre disponível, mas dados podem divergir temporariamente

### CAP na Prática — Nem Tudo é Tão Binário

- **PACELC:** extensão do CAP. Se há Partição (P), escolha A ou C. Senão (E), escolha Latência (L) ou Consistência (C)
- **Consistência Ajustável:** DynamoDB e Cassandra permitem configurar por operação: `CONSISTENT` (tipo CP) ou `EVENTUAL` (tipo AP)
- **Quórum configurável:** `R + W > N` → consistência forte; `R + W <= N` → eventual
- Sistemas reais são híbridos: caminho de pagamento CP, timeline AP, notificações AP

---

## 2. ACID — Garantias dos Bancos Relacionais

### Atomicity (Atomicidade)
- Transação é uma unidade indivisível — ou todas as operações são aplicadas, ou nenhuma
- Se qualquer parte da transação falha, o banco faz rollback de TODAS as mudanças
- **Implementação:** Write-Ahead Log (WAL) — operações são registradas no log antes de serem aplicadas; se crash no meio, o log permite desfazer
- **Exemplo clássico:** transferência bancária
  ```sql
  BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- debita
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- credita
  COMMIT;
  ```
  Se crashar entre os dois UPDATEs, o rollback garante que o dinheiro não desaparece

### Consistency (Consistência)
- A transação leva o banco de um estado válido para outro estado válido
- Todas as regras definidas (constraints, triggers, foreign keys, checks) são respeitadas
- Diferente do "C" do CAP! No ACID, consistência é sobre regras de negócio e integridade de schema
- **Exemplos de violação:** saldo negativo onde há constraint `CHECK (balance >= 0)`, foreign key quebrada

### Isolation (Isolamento)
- Transações concorrentes não interferem umas nas outras
- O resultado final deve ser como se as transações tivessem sido executadas sequencialmente (serializabilidade)
- **Níveis de isolamento (do mais fraco ao mais forte):**

| Nível | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|------------|---------------------|--------------|
| **Read Uncommitted** | ✅ (permite) | ✅ | ✅ |
| **Read Committed** | ❌ (previne) | ✅ | ✅ |
| **Repeatable Read** | ❌ | ❌ | ✅ (MySQL previne) |
| **Serializable** | ❌ | ❌ | ❌ |

- **Dirty Read:** transação lê dado não-committed de outra transação (que pode dar rollback)
- **Non-Repeatable Read:** mesma query dentro da transação retorna valores diferentes (outra transação fez UPDATE+COMMIT)
- **Phantom Read:** mesma query retorna linhas diferentes (outra transação fez INSERT+COMMIT)
- PostgreSQL padrão: Read Committed | MySQL padrão: Repeatable Read

### Durability (Durabilidade)
- Uma vez que a transação foi committed, os dados sobrevivem a qualquer falha (crash, queda de energia)
- **Implementação:** dados são persistidos em disco (WAL/flushed) ANTES de confirmar o commit para o cliente
- Não pode existir "commit confirmado mas dados perdidos"
- **Ameaças:** corrupção de disco, falha de hardware — mitigar com replicação, backups, checksums

---

## 3. BASE — O "ACID" dos Bancos NoSQL

Enquanto ACID é sobre garantias fortes, BASE é sobre aceitar a realidade de sistemas distribuídos em escala.

### Basically Available (Basicamente Disponível)
- O sistema SEMPRE responde, mesmo que parcialmente
- Prefere disponibilidade parcial a indisponibilidade total
- Exemplo: catálogo de produtos responde, mas "produtos relacionados" pode estar offline

### Soft State (Estado Flexível)
- O estado do sistema pode mudar mesmo sem input externo
- Diferente de sistemas ACID onde o estado só muda por transações explícitas
- Réplicas eventualmente consistentes estão mudando constantemente enquanto convergem
- Event sourcing: o estado é derivado de eventos; replay dos eventos produz estado diferente ao longo do tempo

### Eventually Consistent (Eventualmente Consistente)
- Se nenhuma nova atualização ocorrer, eventualmente todos os nós convergirão para o mesmo estado
- "Eventualmente" pode ser milissegundos ou horas, dependendo do sistema
- Enquanto isso, leituras podem retornar dados stale
- **Exemplo DynamoDB:**
  - Escrita confirmada em 2 de 3 nós (quórum de escrita)
  - Leitura de 1 nó (eventual) → pode retornar dado stale
  - Leitura de 2 nós (consistente) → retorna o mais recente

---

## 4. ACID vs BASE — Quando Usar Cada Um

| Característica | ACID | BASE |
|---------------|------|------|
| **Consistência** | Forte (linearizável) | Eventual (com janela de inconsistência) |
| **Disponibilidade** | Pode sacrificar (CP) | Prioriza disponibilidade (AP) |
| **Escala de escrita** | Limitada (single writer) | Horizontal massiva (multi-writer) |
| **Latência** | Maior (coordenação) | Menor (escrita local) |
| **Conflitos** | Prevenidos (locks) | Detectados e resolvidos depois |
| **Casos de uso** | Pagamentos, inventário, booking | Redes sociais, analytics, catálogo |

### Regra Prática
- **Precisa de transações?** ACID (PostgreSQL, MySQL)
- **Precisa de escala massiva de escrita?** BASE (Cassandra, DynamoDB)
- **Precisa dos dois?** CQRS + Event Sourcing: caminho de escrita ACID, caminho de leitura BASE
- **Não tem certeza?** Comece com PostgreSQL. Migre partes específicas para NoSQL quando necessário.

---

## 5. Conceitos Relacionados que Caem em Entrevista

### SOLID
- **S**ingle Responsibility — uma classe, uma razão para mudar
- **O**pen/Closed — aberto para extensão, fechado para modificação
- **L**iskov Substitution — subclasse deve poder substituir classe base
- **I**nterface Segregation — interfaces pequenas e focadas
- **D**ependency Inversion — depender de abstrações, não de implementações

### KISS (Keep It Simple, Stupid — Mantenha Simples)
- Simplicidade é a maior sofisticação
- Toda complexidade que você adiciona hoje, alguém vai pagar amanhã (provavelmente você)

### Idempotência
- `f(f(x)) = f(x)`: aplicar a operação múltiplas vezes tem o mesmo efeito de aplicar uma vez
- Essencial em sistemas distribuídos onde retries são inevitáveis
- **Idempotente:** PUT (atualiza para valor X, não importa quantas vezes), DELETE
- **Não-idempotente:** POST (cria novo recurso a cada chamada)
- **Implementação:** idempotency keys — cliente gera UUID, servidor armazena resultado da primeira execução, retorna cached result para retries
