# WebSocket, QUIC, BGP e WebRTC — Referência Detalhada

## 1. WebSocket Scaling

### O Modelo de Conexão
```
Cliente ──TCP──→ Servidor
                Upgrade: websocket
Cliente ←──101 Switching Protocols── Servidor
         Conexão full-duplex persistente
```

### O Problema de Escala
Cada conexão WebSocket ocupa 1 socket TCP no servidor. Limite do Linux por processo: ~65K file descriptors (ajustável). Para 1M de conexões, precisa de tuning.

### Vertical Scaling (1 servidor, muitas conexões)
```bash
# /etc/sysctl.conf
fs.file-max = 2000000
fs.nr_open = 2000000
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 100000

# /etc/security/limits.conf
* soft nofile 2000000
* hard nofile 2000000
```
Com tuning: 1M+ conexões por servidor (WhatsApp fez com Erlang, hoje possível com Go/Rust/Node.js cluster).

### Horizontal Scaling (múltiplos servidores)
```
[Load Balancer] ──→ [WS Server 1] ──→ [Redis Pub/Sub]
                ──→ [WS Server 2] ──→ [Redis Pub/Sub]
                ──→ [WS Server 3] ──→ [Redis Pub/Sub]
```
LB precisa de IP hash ou cookie para sticky (WebSocket é stateful — mesma conexão SEMPRE no mesmo servidor). Redis Pub/Sub para broadcast entre servidores.

### Adapter Pattern (Backend agnóstico)
```typescript
interface WebSocketAdapter {
  send(userId: string, event: string, payload: unknown): Promise<void>;
  broadcast(event: string, payload: unknown): Promise<void>;
  isConnected(userId: string): Promise<boolean>;
}

// Implementação: Redis Pub/Sub entre instâncias
class RedisWSAdapter implements WebSocketAdapter {
  async send(userId: string, event: string, payload: unknown): Promise<void> {
    const serverId = await this.redis.get(`user:${userId}:server`);
    if (serverId === this.serverId) {
      this.localSend(userId, event, payload);
    } else {
      await this.redis.publish(`ws:${serverId}`, JSON.stringify({ userId, event, payload }));
    }
  }
}
```

### Heartbeat + Reconexão
```typescript
// Servidor: ping a cada 30s
setInterval(() => { ws.ping(); }, 30000);

// Cliente: reconexão automática
const ws = new ReconnectingWebSocket(url, [], {
  maxReconnectAttempts: 10,
  reconnectInterval: (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000),
});
```

---

## 2. QUIC (HTTP/3 Transport)

### Por que QUIC?
- **TCP head-of-line blocking:** perda de 1 pacote TCP bloqueia TODOS streams HTTP/2
- **QUIC:** streams independentes sobre UDP. Perda em stream 1 não afeta stream 2
- **0-RTT handshake:** conexões subsequentes começam instantaneamente
- **Connection migration:** muda de WiFi para 4G sem reconectar (usa connection ID, não IP/porta)

```
TCP + TLS 1.3:  2-3 RTTs (50-150ms) para estabelecer
QUIC:           0-1 RTT  (0-50ms)
```

### QUIC na Prática
```nginx
# Nginx com QUIC (HTTP/3)
server {
    listen 443 quic reuseport;
    listen 443 ssl;
    http3 on;
    add_header Alt-Svc 'h3=":443"; ma=86400';
}
```
Browser automaticamente tenta QUIC primeiro. Se falhar, fallback para HTTP/2.

---

## 3. BGP (Border Gateway Protocol)

### O Que é
BGP é o protocolo que ROTEIA A INTERNET. Sem BGP, sem internet global. Ele decide por onde os pacotes viajam entre sistemas autônomos (AS).

```
[AS 16509 (Amazon)] ──BGP──→ [AS 15169 (Google)]
     "Eu tenho 52.84.0.0/16"     "Eu tenho 8.8.8.0/24"
```

### AS Path
Cada AS anuncia quais prefixos IP possui. BGP escolhe o caminho com MENOR AS path.
```
Origem: AS 100 anuncia 10.0.0.0/8
AS 200: "10.0.0.0/8 via [200, 100]" (2 hops)
AS 300: "10.0.0.0/8 via [300, 400, 100]" (3 hops)
→ AS 200 é escolhido (menor path)
```

### BGP na Vida Real
- **Cloud:** AWS Direct Connect, Azure ExpressRoute usam BGP para anunciar VPC/VNet
- **CDN:** Cloudflare, Akamai usam BGP anycast (mesmo IP anunciado de múltiplos locais)
- **DDoS mitigation:** BGP Flowspec para blackhole tráfego de ataque

### BGP Anycast
```
[IP 1.1.1.1] anunciado de: São Paulo, Londres, Tóquio, Sydney
Usuário em SP → roteado para servidor em SP (menor distância BGP)
Usuário em JP → roteado para servidor em Tóquio
Mesmo IP, servidores diferentes. Roteamento resolve.
```

---

## 4. WebRTC (Web Real-Time Communication)

### O Que é
Comunicação P2P direta entre browsers. Voz, vídeo, dados. SEM servidor intermediário para mídia.

```
[Browser A] ←──P2P (UDP)──→ [Browser B]
     │                            │
     └──────Signaling (WebSocket)─┘ (só para estabelecer conexão)
```

### Componentes
| Componente | Propósito |
|-----------|-----------|
| **getUserMedia()** | Capturar câmera/microfone |
| **RTCPeerConnection** | Conexão P2P (áudio, vídeo, dados) |
| **RTCDataChannel** | Dados arbitrários P2P (chat, arquivos) |
| **Signaling** | Trocar SDP (Session Description) — WebSocket/REST |

### STUN e TURN (NAT Traversal)
```
Browser A ──STUN──→ [STUN Server] → "Seu IP público é 203.0.113.5:54321"
Browser B ──STUN──→ [STUN Server] → "Seu IP público é 198.51.100.3:12345"
→ Conexão P2P direta (80% dos casos funciona)

Se NAT simétrico bloqueia direto:
Browser A ──TURN──→ [TURN Server] ←──TURN── Browser B
→ TURN relay (mídia passa pelo servidor. Caro. Último recurso.)
```

### WebRTC Scaling (SFU — Selective Forwarding Unit)
```
3 participantes P2P = cada um envia 2 streams. 6 streams total.
50 participantes P2P = cada um envia 49 streams. 2450 streams. INVIÁVEL.

SFU (Selective Forwarding Unit):
[Participante 1] ──1 stream──→ [SFU] ──→ todos recebem
[Participante 2] ──1 stream──→ [SFU]
...
Cada um envia 1 stream para SFU. SFU distribui. Escala linear.
```
Ferramentas: **mediasoup** (Node.js), **Janus** (C), **LiveKit** (Go), **Jitsi** (open-source).
