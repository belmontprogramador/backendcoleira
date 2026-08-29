---
name: redes
description: "TCP/UDP, HTTP/1.1 a HTTP/3, DNS, CDN, load balancers, proxies, SSH, VPN, IPv4/IPv6, firewall e push notifications."
---

# Redes

Cobre protocolos de rede (TCP, UDP, HTTP/1.1 até HTTP/3, WebSocket, QUIC), DNS e CDN (resolução, registros, edge computing), infraestrutura (load balancers, reverse proxies, SSH, VPN, firewall) e endereçamento (IPv4/IPv6, sub-redes, CIDR, NAT).

## Quando usar

- Entendendo diferenças entre HTTP/1.1, HTTP/2 e HTTP/3
- Debugando problemas de DNS ou configurando CDN
- Escolhendo entre TCP e UDP para um caso de uso
- Configurando SSH, VPN ou firewall
- Compreendendo IPv6, subnetting ou NAT

## Fluxo

1. Identifique a camada: protocolos, DNS/CDN, infraestrutura ou endereçamento
2. Carregue a referência relevante em `references/`
3. Redes são pilha: protocolos rodam sobre IP, que usa DNS, protegido por firewall

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [protocolos.md](references/protocolos.md) | TCP (3-way handshake, controle de fluxo), UDP, HTTP/1.1→2→3, QUIC, WebSocket |
| [dns-cdn.md](references/dns-cdn.md) | DNS (resolução, record types, DNSSEC), CDN (edge, pull/push, cache) |
| [infra-rede.md](references/infra-rede.md) | Load balancer, proxy reverso, SSH, VPN, firewall, push notifications |
| [ip-subnets.md](references/ip-subnets.md) | IPv4 vs IPv6, subnetting, CIDR, NAT, roteamento |`n| [websocket.md](references/websocket.md) | WebSocket scaling, QUIC, BGP, WebRTC, STUN/TURN, SFU |
| [troubleshooting.md](references/troubleshooting.md) | Cenários reais: latência, DNS, conexão recusada, SSL, perda de pacotes, WebSocket |
