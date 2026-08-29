# Load Balancing — Referência Detalhada

## 1. O Problema que Load Balancing Resolve

Todo sistema que cresce enfrenta o mesmo dilema:
- Um único servidor tem limite de CPU, memória, conexões e I/O
- Para atender mais usuários, você precisa de múltiplos servidores
- Alguém precisa decidir qual servidor atende cada requisição → esse é o Load Balancer

**Objetivos além de distribuir tráfego:**
- Alta disponibilidade (se um servidor cair, tráfego vai para os saudáveis)
- Elasticidade (adicionar/remover servidores sem downtime)
- Manutenção sem interrupção (drenar tráfego de um servidor, atualizar, reativar)

---

## 2. Layer 4 vs Layer 7 — A Diferença Real

### Layer 4 (Camada de Transporte — TCP/UDP)
- Trabalha no nível de IP e porta
- **Não inspeciona o conteúdo** do pacote, apenas cabeçalhos TCP/UDP
- Roteamento: IP de origem, porta, IP de destino
- **Velocidade:** extremamente rápido, processado em kernel space
- **Limitação:** não entende HTTP, então não pode rotear por URL, cookie, ou header
- **Quando usar:** tráfego não-HTTP (bancos de dados, SMTP, WebSocket raw), ou quando performance é crítica
- Exemplos: HAProxy (modo TCP), AWS NLB (Network Load Balancer), LVS (Linux Virtual Server)

### Layer 7 (Camada de Aplicação — HTTP/HTTPS)
- **Inspeciona o conteúdo** da requisição HTTP
- Roteamento por: caminho da URL, headers, cookies, método HTTP, body (limitado)
- Pode fazer término SSL, modificar headers, adicionar/remover cookies
- **Mais lento** que L4 (precisa decriptografar TLS, parsear HTTP), mas mais inteligente
- **Quando usar:** APIs, websites, microsserviços — qualquer coisa HTTP
- Exemplos: Nginx, HAProxy (modo HTTP), AWS ALB, Envoy, Traefik

### Tabela Comparativa
| Característica | L4 | L7 |
|---------------|-----|-----|
| **Latência** | Microssegundos | Milissegundos |
| **Entende HTTP?** | Não | Sim |
| **Término SSL** | Não | Sim |
| **Roteamento por URL** | Não | Sim |
| **Sessões Pegajosas** | Por IP apenas | Por cookie |
| **Rate Limiting** | Básico (IP) | Avançado (por user/token) |
| **Testes A/B** | Não | Sim (por cookie/header) |
| **WAF** | Não | Sim (pode integrar) |

### Arquitetura Típica: L4 + L7 combinados
```
Internet → L4 LB (rápido, distribui para...) → L7 LBs (inteligente, roteia para...) → App Servers
```
- L4 na frente: absorve tráfego bruto, DDoS básico, balanceamento inicial
- L7 atrás: roteamento avançado, SSL, rate limiting, autenticação

---

## 3. Algoritmos de Balanceamento — Detalhados

### 3.1 Round Robin (Rodízio Circular)
- Cada requisição vai para o próximo servidor da lista, circularmente
- **Vantagem:** trivial de implementar, justo se todas as requisições têm custo similar
- **Desvantagem:** não considera carga real do servidor; se uma requisição é pesada e a próxima é leve, o servidor com a pesada pode sobrecarregar
- **Round Robin Ponderado:** atribui peso a cada servidor; servidores mais potentes recebem mais requisições proporcionalmente

### 3.2 Least Connections (Menos Conexões)
- Envia para o servidor com menos conexões TCP ativas no momento
- **Vantagem:** adapta-se dinamicamente à carga real; bom quando requisições têm durações variadas
- **Desvantagem:** não considera o custo computacional de cada conexão; uma conexão pode ser um keep-alive ocioso e outra pode estar processando vídeo
- Ideal para: aplicações com conexões de longa duração (WebSocket, streaming, SSH)

### 3.3 Least Time (Menor Tempo de Resposta)
- Combina "least connections" com "menor latência média"
- O LB monitora o tempo de resposta de cada servidor e envia para o mais rápido
- **Vantagem:** otimiza experiência do usuário (vai para o servidor que responde mais rápido)
- **Desvantagem:** requer health checks ativos medindo latência; pode causar oscilação
- Exemplo: NGINX Plus `least_time`

### 3.4 IP Hash
- Hash do IP de origem do cliente determina o servidor
- Mesmo cliente SEMPRE vai para o mesmo servidor (sessões pegajosas sem cookies)
- **Vantagem:** útil quando você precisa de afinidade de sessão mas não quer usar cookies
- **Desvantagem:** se um servidor cair, TODOS os clientes daquele hash vão para outro
- **Consistent Hashing:** variante onde adicionar/remover servidores minimiza a redistribuição

### 3.5 Random (Aleatório)
- Aleatório puro
- **Vantagem:** simples, sem estado, sem tracking
- **Desvantagem:** possível desbalanceamento estatístico em amostras pequenas
- Curiosidade: Two-random-choices (poder de duas escolhas) — escolhe 2 servidores aleatoriamente e envia para o menos carregado. Performance próxima do ótimo

### 3.6 Weighted (Ponderado)
- Cada servidor tem um peso baseado em capacidade (CPU, RAM, ou config manual)
- Funciona em combinação com outros algoritmos: Round Robin Ponderado, Least Connections Ponderado
- **Vantagem:** permite misturar servidores heterogêneos no mesmo pool
- **Peso Dinâmico:** ajustado com base em métricas reais (CPU, latência, taxa de erro)

---

## 4. Sessões Pegajosas (Sticky Sessions) — O Mal Necessário

### O problema que resolve
- Aplicações stateful que armazenam sessão em memória local do servidor
- Se o cliente muda de servidor, perde a sessão → logout, carrinho vazio, etc.

### Como implementar
- **L4:** hash do IP (frágil: NAT, troca de rede wifi → celular)
- **L7:** cookie de afinidade (`SERVERID=node1`) injetado pelo LB
- **Duração configurável:** "enquanto o cookie existir" ou "por N minutos"

### Por que é um "mal necessário"
- Viola o princípio de statelessness
- Cria hotspots (um usuário pesado sempre no mesmo servidor)
- Dificulta drenagem de servidor para manutenção
- **Alternativa melhor:** externalizar sessão para Redis/DB → qualquer servidor atende qualquer requisição

---

## 5. Health Checks — O Coração do Load Balancer

### Tipos
- **Passivo:** LB observa respostas (códigos 5xx, timeouts) e deduz que o servidor está doente
- **Ativo:** LB envia probes periódicos (`GET /health`) e marca servidor como down se falhar N vezes consecutivas
- **Health check L4:** TCP connect na porta — só confirma que algo está ouvindo
- **Health check L7:** HTTP request com validação de resposta — confirma que o app está funcionando
- **Health check profundo:** a rota de health verifica DB, cache, filas — se qualquer dependência falhar, o servidor se declara unhealthy

### Parâmetros
- **Intervalo:** a cada quantos segundos? (típico: 5-30s)
- **Timeout:** quanto tempo espera resposta? (típico: 2-5s)
- **Limite unhealthy:** quantas falhas consecutivas para marcar como down? (típico: 2-3)
- **Limite healthy:** quantos sucessos para marcar como up novamente? (típico: 2-3)

### Slow Start / Aquecimento
- Servidor que acabou de subir recebe tráfego gradualmente
- Evita que um servidor frio (caches vazios, JIT não aquecido) seja inundado e colapse
- Exemplo: AWS ALB tem modo slow start configurável por target group

---

## 6. Casos de Uso Avançados

### Término SSL/TLS
- LB decriptografa HTTPS e encaminha HTTP para os backends
- **Vantagem:** backends não gastam CPU com criptografia; certificados gerenciados em um só lugar
- **Desvantagem:** tráfego interno não é criptografado (mitigar com VPC ou mTLS entre LB e backend)
- **SSL Pass-Through (L4):** LB não decriptografa; passa o tráfego TLS direto para o backend (criptografia ponta a ponta)

### Roteamento por Conteúdo
- `GET /api/users/*` → user-service
- `GET /api/orders/*` → order-service
- `GET /static/*` → CDN ou servidor de assets
- **Exemplo real:** Kubernetes Ingress Controller faz isso com regras de path

### Deploy Canário
- 90% tráfego → versão atual (v1)
- 10% tráfego → nova versão (v2)
- Se métricas de v2 estão ok (erros, latência), aumenta gradualmente até 100%
- Implementação: LB com pesos configuráveis por target group

### Deploy Blue-Green
- Blue = ambiente atual (100% tráfego)
- Green = ambiente novo (0% tráfego)
- Deploy completo no green, testa, e faz LB apontar 100% para green
- Rollback instantâneo: só apontar LB de volta para blue

### Rate Limiting no LB
- Limitar requisições por IP, chave de API, ou usuário
- Protege backends de abuso
- Algoritmos: token bucket, sliding window, fixed window
- Exemplo: Nginx `limit_req_zone` + `limit_req`

### Testes A/B
- Usuários com cookie `experiment=v2` vão para backend com feature nova
- Usuários sem cookie: divisão aleatória 50/50
- Métricas comparativas para decidir qual versão é melhor

---

## 7. Topologias de Deploy de Load Balancer

### LB Único (simples, ponto único de falha)
```
Internet → LB → Servidores
```
- Simples, mas o LB é single point of failure

### Par de LBs (Ativo-Passivo)
```
Internet → VIP (IP Virtual)
              ├── LB1 (ativo)
              └── LB2 (passivo, assume se LB1 cair)
         LBs → Servidores
```
- Failover via VRRP (Virtual Router Redundancy Protocol) ou similar
- Exemplo: Keepalived + HAProxy

### Cluster de LBs (Ativo-Ativo)
```
Internet → DNS Round Robin
              ├── LB1 ──→ Servidores
              └── LB2 ──→ Servidores
```
- Ambos LBs ativos, DNS distribui entre eles
- Se um LB cair, DNS precisa tirar o IP (TTL do DNS é o calcanhar de Aquiles)

### Cloud-Native (AWS como exemplo)
```
Internet → Route 53 → ALB → Target Groups → EC2/ECS/Lambda
                         ├── TG-Users → Users Service
                         ├── TG-Orders → Orders Service
                         └── TG-Static → S3 (via CloudFront)
```
- Totalmente gerenciado, sem servidor de LB para administrar
- Auto-scaling integrado: ALB detecta novos targets e começa a enviar tráfego
