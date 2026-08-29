# Reddit — 1 Bilhão de Usuários por Mês

## 1. O Contexto

Reddit é uma das plataformas de comunidade mais acessadas do mundo: 1B+ usuários/mês, milhões de comunidades (subreddits), votos, comentários, posts.

---

## 2. Arquitetura

### Monolith → Microservices
Reddit começou como monolith Python (Pylons). Migrou gradualmente para microsserviços conforme times cresciam.

```
[Monolith Python] → extração gradual por domínio
    ↓
[Post Service] [Comment Service] [Vote Service] [User Service]
```

### Stack Atual
- **Backend:** Python (serviços legados), Go (novos serviços)
- **Frontend:** React (new Reddit), Node.js
- **DB:** PostgreSQL (metadados, usuários), Cassandra (votos)
- **Cache:** Memcached (posts quentes, threads populares)
- **Mensageria:** Kafka
- **CDN:** Fastly + Cloudflare

---

## 3. Votos — O Desafio de Escala

Votos no Reddit são write-heavy massivo. Cada voto é uma escrita. Posts populares recebem milhares de votos por minuto.

### Solução: Cassandra
```
Votos → Cassandra (write-optimized, append-only)
         ↓ async
      PostgreSQL (aggregado: vote_count)
```
Cassandra absorve o write massivo. Agregados (contagem) vão para PostgreSQL de forma assíncrona.

### Por que não PostgreSQL para votos?
- PostgreSQL é row-locking. Milhares de updates na mesma linha (vote_count do post) = contenção.
- Cassandra é append-only. Cada voto = nova linha. Zero contenção.

---

## 4. Caching — Multi-Camada

```
[CDN (Fastly)] → assets estáticos, posts populares (30s TTL)
     ↓
[Memcached] → posts quentes, comentários recentes
     ↓
[PostgreSQL] → cold data, dados de usuário
```

Posts na front page são cacheados agressivamente. Um post na front page recebe milhões de views em horas. Cache de 30 segundos reduz carga em 99%.

---

## 5. Thundering Herd no Cache

**Problema:** quando um post viral expira do cache, milhares de requests batem no DB simultaneamente.

### Solução: Lock de Regeneração
```python
# Só UM worker regenera o cache
if redis.set("lock:post:123", "1", nx=True, ex=5):
    data = db.query(post)
    memcached.set("post:123", data, 60)
    redis.delete("lock:post:123")
else:
    time.sleep(0.1)
    return memcached.get("post:123")  # outro worker já regenerou
```

---

## 6. Lições
1. **Escolha o DB pelo workload.** Posts/usuários → PG. Votos → Cassandra.
2. **Cache agressivo na front page.** 30s de cache = 99% menos carga.
3. **Thundering herd é real.** Lock de regeneração resolve.
4. **Migração de monolith é gradual.** Extraia por domínio, não reescreva tudo.
