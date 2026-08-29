# Protocolos de Rede — Referência Detalhada

## 1. TCP (Transmission Control Protocol)

### 3-Way Handshake
```
Client                    Server
  |── SYN, seq=x ───────→  |
  |                         |
  |←─ SYN-ACK, seq=y,     |
  |   ack=x+1 ──────────   |
  |                         |
  |── ACK, seq=x+1,       |
  |   ack=y+1 ──────────→  |
  |                         |
  |◄═════ Dados ════════►  |
```

### Garantias
- **Entrega confiável:** ACK confirma recebimento. Sem ACK → retransmite
- **Ordenação:** sequence numbers garantem ordem
- **Controle de fluxo:** receptor diz quanto pode receber (window size)
- **Controle de congestionamento:** slow start, congestion avoidance
- **Conexão full-duplex:** ambos enviam/recebem simultaneamente

### Flag Bits
| Flag | Significado |
|------|-------------|
| SYN | Sincronizar (iniciar conexão) |
| ACK | Reconhecimento |
| FIN | Finalizar conexão |
| RST | Reset (recusar conexão) |
| PSH | Push (entregar dados à aplicação) |
| URG | Urgente |

### Quando Usar TCP
- Confiabilidade é obrigatória (HTTP, SMTP, SSH, transferência de arquivos)
- Dados precisam chegar completos e ordenados
- Exemplo: carregar página web (HTML perdido = página quebrada)

---

## 2. UDP (User Datagram Protocol)

- **Sem conexão:** manda e esquece (fire-and-forget)
- **Sem garantia:** sem ACK, sem retransmissão, sem ordem
- **Mais rápido:** sem overhead de handshake e controle
- **Pacotes independentes:** cada datagrama é autônomo

### Top 4 Use Cases

**1. Live Video Streaming (VoIP, videochamada)**
Perder um frame não importa. Retransmitir frame atrasado é PIOR que não receber (já passou). Latência baixa > perfeição.

**2. DNS**
Queries pequenas (um pacote). TCP handshake seria mais caro que a query. UDP query → resposta em 1 round-trip.

**3. Market Data Multicast (Trading de baixa latência)**
Múltiplos destinatários simultâneos (multicast). Microssegundos importam. Retransmissão TCP inviabilizaria.

**4. IoT (Internet das Coisas)**
Pacotes pequenos, muitos dispositivos, redes com perda. Overhead TCP seria proibitivo para bateria e banda.

### QUIC (Quick UDP Internet Connections)
- Google criou. HTTP/3 usa QUIC
- UDP-based, mas com confiabilidade, TLS 1.3 built-in, multiplexing sem head-of-line blocking
- 0-RTT handshake (conexões subsequentes começam instantaneamente)

---

## 3. HTTP/1.1 → HTTP/2 → HTTP/3

### HTTP/1.1
```
GET /index.html     → 1 conexão TCP, aguarda...
GET /style.css      → nova conexão (ou keep-alive, mas serial)
GET /script.js      → nova conexão
```
- **Head-of-line blocking:** request 1 bloqueia request 2
- **Workaround:** múltiplas conexões TCP (6-8 por domínio)
- Formato texto. Headers repetidos em cada request.

### HTTP/2
```
1 conexão TCP:
  Stream 1: GET index.html  ──→
  Stream 2: GET style.css   ──→  (paralelo!)
  Stream 3: GET script.js   ──→
```
- **Multiplexing:** múltiplos streams em 1 conexão TCP
- **HPACK:** compressão de headers (reduz overhead)
- **Server Push:** servidor envia CSS/JS antes do cliente pedir
- **Binary framing:** mais eficiente que texto
- **Ainda TCP:** head-of-line blocking no nível TCP (perda de pacote bloqueia TODOS streams)

### HTTP/3 (QUIC)
```
UDP + QUIC:
  Stream 1: dados...
  Stream 2: dados... (perda em stream 1 não afeta 2!)
```
- **Sem head-of-line blocking:** streams independentes sobre UDP
- **0-RTT:** conexões subsequentes sem handshake
- **TLS 1.3 built-in:** segurança obrigatória
- **Connection migration:** muda de WiFi para 4G sem perder conexão

### Evolução Visual
```
HTTP/1.1:  Texto  | Serial   | TCP
HTTP/2:    Binário| Paralelo | TCP (head-of-line blocking TCP)
HTTP/3:    Binário| Paralelo | UDP + QUIC (sem head-of-line blocking)
```

---

## 4. WebSocket

```
Cliente: "Upgrade: websocket" sobre HTTP
Servidor: "101 Switching Protocols"
Conexão full-duplex estabelecida!
```
- **Full-duplex:** ambos enviam a qualquer momento
- **Persistente:** uma conexão TCP para N mensagens
- **Menos overhead que HTTP polling:** sem headers HTTP a cada mensagem
- **Use cases:** chat, jogos multiplayer, colaboração em tempo real, dashboards live

### WebSocket vs SSE (Server-Sent Events)
| | WebSocket | SSE |
|---|----------|-----|
| Direção | Bidirecional | Servidor → Cliente |
| Protocolo | ws:// / wss:// | HTTP |
| Reconnect | Manual | Automático (EventSource API) |
| Binary | Sim | Não (texto) |

### WebSocket vs HTTP Polling
```
Polling:   Cliente: "tem algo?" → Servidor: "não" (× 100 vazio)
WebSocket: Conexão aberta. Servidor: "evento!" → Cliente recebe instantâneo
```

---

## 5. Modelo OSI vs TCP/IP

| Camada OSI | TCP/IP | Exemplos |
|-----------|--------|----------|
| 7. Application | Application | HTTP, DNS, SMTP, SSH, WebSocket |
| 6. Presentation | Application | TLS/SSL, MIME |
| 5. Session | Application | Sockets, NetBIOS |
| 4. Transport | Transport | TCP, UDP, QUIC |
| 3. Network | Internet | IP, ICMP, IPSec |
| 2. Data Link | Network Access | Ethernet, Wi-Fi, ARP |
| 1. Physical | Network Access | Cabo, fibra, rádio |

Na prática, falamos do modelo TCP/IP (4 camadas). OSI é referência teórica.
