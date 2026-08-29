# Performance em Sistemas DDD

> Performance respeita o dominio. Nao sacrificamos o modelo por velocidade.

## 1. Onde Otimizar (sem violar o dominio)

### Cache via Port (Respeitando o Dominio)
```typescript
// PORT (dominio define)
interface CachePort { get<T>(key: string): Promise<T|null>; set<T>(key: string, value: T, ttl: number): Promise<void>; }

// ADAPTER (infra implementa com Redis)
class RedisCacheService implements CachePort { /* Redis */ }

// USE CASE (application usa via port)
class GetOrderUseCase {
  async execute(id: string): Promise<OrderResponseDto> {
    return this.cache.getOrSet(`order:${id}`, () => this.repo.findById(id), 300);
  }
}
```
Dominio nao sabe que e Redis. Pode ser Memcached, in-memory, ou nada.

### Read Model via CQRS
Write side usa Aggregates (consistente). Read side usa projecoes (rapido).
Queries de listagem nao tocam no aggregate.

### Materialized Views para Relatorios
Pre-computar no Read DB. Nao fazer JOIN monstro no aggregate.

## 2. Latency Numbers (Contexto DDD)

| Operacao | Tempo | Impacto no DDD |
|----------|-------|----------------|
| Chamada em processo | ns | Aggregate chama Domain Service |
| Chamada localhost | us | Use Case chama Repository (mesmo servico) |
| Chamada cross-AZ | 500 us | Servico DDD chama outro servico (mesma regiao) |
| Chamada cross-regiao | 150 ms | Bounded Context chama outro cross-regiao = EVITE! |

### Implicacoes Praticas
- Aggregate chama Domain Service: em processo, ns = irrelevante. Pode chamar a vontade.
- Repository (mesmo servico): localhost, us = ok. Mas cuidado com N+1.
- Integration Event (Kafka): ms de latencia. Assincrono = nao bloqueia usuario.
- REST/gRPC cross-context sincrono: cuidado com latencia acumulada e cascading failures.

## 3. Otimizacao sem Corromper o Modelo

| Tecnica | Como fazer em DDD |
|---------|-------------------|
| Cache | CachePort no dominio. Redis na infra. |
| Leitura rapida | CQRS. Read Model separado do Aggregate. |
| Pre-computacao | Materialized View no Read DB. |
| Batch | Processamento assincrono via Integration Events. |
| CDN | So para assets estaticos. Nao para dados do dominio. |

## 4. O que NUNCA Fazer

- Colocar logica de performance no Aggregate (ex: "se total > 1000, nao validar X")
- Criar Value Object so para performance (ex: CachedMoney)
- Acoplar dominio ao Redis, CDN ou qualquer infra
- Usar cache para esconder modelo mal projetado
