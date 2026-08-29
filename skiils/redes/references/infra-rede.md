# Infraestrutura de Rede — Referencia Detalhada

## 1. Load Balancer vs Reverse Proxy vs API Gateway

| | L4 LB | L7 LB | Reverse Proxy | API Gateway |
|---|-------|-------|---------------|-------------|
| Nivel | TCP/UDP | HTTP | HTTP | HTTP/API |
| Roteamento | IP+Porta | URL,header | URL,header | URL,header,key |
| SSL Term | Nao | Sim | Sim | Sim |
| Auth | Nao | Nao | Nao | Sim |
| Rate Limit | Nao | Basico | Basico | Avancado |
| Transform | Nao | Nao | Sim | Sim |

Quando usar: L4 (DB, SMTP), L7 (HTTP routing), Reverse Proxy (staticos), API Gateway (auth + rate limit).

## 2. SSH

1. TCP connect porta 22
2. Diffie-Hellman key exchange -> chave de sessao
3. Autenticacao (senha ou chave publica/privada)
4. Sessao criptografada

**Chaves:** `ssh-keygen -t ed25519`. Publica no servidor (~/.ssh/authorized_keys). Privada local (nunca compartilhar).
**known_hosts:** fingerprint do servidor. Alerta se mudar (possivel MITM).

## 3. VPN

Tipos: Site-to-Site (redes), Client-to-Site (dispositivo), SSL VPN (browser), Split Tunnel.

Protocolos: WireGuard (moderno, kernel, 4K linhas), OpenVPN (maduro), IPSec (suite), L2TP (legado).

## 4. Firewall

Tipos: Packet Filtering (IP/porta), Stateful (lembra conexoes), Application-Level (inspeciona HTTP), NGFW (tudo + IPS).

Top 6 Use Cases:
1. Packet filtering (bloquear IPs/portas)
2. Stateful inspection (resposta automatica)
3. Application filtering (bloquear HTTP malicioso)
4. DDoS protection (rate limiting, SYN flood)
5. VPN termination (endpoint de tunel)
6. Network segmentation (DMZ, internal, guest)

Security Groups (cloud): inbound/outbound rules por instancia. Stateful.

## 5. Push Notification System

Business Services -> Notification Gateway -> Distribution Service -> Message Queue -> Channel Services (In-App, Email, SMS, Social) -> Tracking & Analytics

Decisoes: single vs batch, templates por tipo, user preferences por canal, tracking (delivered/opened/clicked).
