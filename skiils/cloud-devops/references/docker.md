# Docker — Referencia Detalhada

## 1. Como Funciona (Por Baixo)

Docker nao e VM. E containerizacao via kernel Linux.

**Namespaces (isolamento):** PID (processo ve so os seus), Network (IP proprio), Mount (filesystem proprio), UTS (hostname), IPC, User.

**Cgroups (limites):** `--memory=512m`, `--cpus=2`, `--pids-limit=100`.

**Union FS (Overlay2):** camadas imutaveis compartilhadas entre containers. Camada superior RW para mudancas.

---

## 2. Dockerfile — Boas Praticas

```dockerfile
FROM node:20-alpine               # imagem especifica + alpine (leve)
RUN addgroup app && adduser -S app # user nao-root
WORKDIR /app
COPY package*.json ./              # package.json primeiro = cache layer
RUN npm ci --only=production
COPY --chown=app:app . .
USER app                           # nao root!
EXPOSE 3000
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

### Regras de Ouro
1. Imagens especificas (`node:20-alpine`), nunca `latest`
2. Multi-stage builds: compile em estagio 1, copie binario para imagem final minima
3. COPY package.json primeiro → cache de `npm install`
4. USER nao-root
5. .dockerignore: excluir node_modules, .git, logs
6. Alpine quando possivel (imagens 10x menores, mas musl pode dar problema com binarios nativos)
7. Tags versionadas + sha256 para reprodutibilidade

### Multi-Stage Build
```dockerfile
FROM golang:1.22 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o server

FROM alpine:3.19
COPY --from=builder /app/server /server
CMD ["/server"]
# Imagem final: ~10 MB vs ~800 MB com golang direto
```

---

## 3. Docker Compose
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on:
      db:
        condition: service_healthy  # espera DB pronto
    restart: unless-stopped
  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
volumes:
  pgdata:
```

---

## 4. Networking
| Driver | Descricao |
|--------|-----------|
| bridge | Rede isolada (padrao) |
| host | Network stack do host (perf maxima) |
| overlay | Multi-host (Swarm) |
| none | Totalmente isolado |

Compose cria rede bridge + DNS interno automatico. `app` resolve `db` como hostname.

---

## 5. Volumes
| Tipo | Descricao |
|------|-----------|
| Volume | Gerenciado pelo Docker. Portavel. Uso: producao |
| Bind Mount | Mapeia path do host. Uso: dev (hot reload) |
| tmpfs | Em memoria. Uso: dados sensiveis temporarios |

---

## 6. Docker Compose vs Kubernetes
| Compose | Kubernetes |
|---------|------------|
| Single host | Multi-host |
| Dev/staging | Producao |
| Sem auto-healing | Auto-healing |
| Simples | Complexo |
