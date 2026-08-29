# DNS e CDN — Referência Detalhada

## 1. DNS (Domain Name System)

Traduz nomes → IPs. A lista telefônica da internet.

### Hierarquia
```
Root DNS Servers (13 clusters globais)
  ↓
TLD Servers (.com, .org, .br, .io)
  ↓
Authoritative Servers (exemplo.com, google.com)
  ↓
Registro A: exemplo.com → 93.184.216.34
```

### Resolução Completa
```
1. Browser: "exemplo.com?"
2. OS Cache: não tem
3. Recursive Resolver (ISP/8.8.8.8): "exemplo.com?"
4. Root Server: "não sei, mas .com é ali →"
5. TLD Server (.com): "não sei, mas exemplo.com é ali →"
6. Authoritative (exemplo.com): "é 93.184.216.34!"
7. Resolver cacheia e retorna
8. Browser conecta no IP
```

### Caching DNS
```
Browser Cache → OS Cache (hosts) → Router Cache → ISP Resolver Cache
```
TTL (Time to Live) define quanto tempo cachear. TTL baixo = mudanças propagam rápido. TTL alto = menos queries.

### Record Types
| Tipo | Propósito | Exemplo |
|------|-----------|---------|
| **A** | IPv4 | `exemplo.com A 93.184.216.34` |
| **AAAA** | IPv6 | `exemplo.com AAAA 2606:2800:220:1:248:1893:25c8:1946` |
| **CNAME** | Alias (aponta para outro nome) | `www.exemplo.com CNAME exemplo.com` |
| **MX** | Servidor de email | `exemplo.com MX 10 mail.exemplo.com` |
| **NS** | Nameserver | `exemplo.com NS ns1.exemplo.com` |
| **TXT** | Texto (SPF, DKIM, verificação) | `exemplo.com TXT "v=spf1 ..."` |
| **SOA** | Autoridade da zona | Informações administrativas |
| **SRV** | Serviço específico | `_sip._tcp.exemplo.com SRV ...` |
| **PTR** | Reverso (IP → nome) | `34.216.184.93.in-addr.arpa PTR exemplo.com` |

### DNSSEC (DNS Security Extensions)
- Assina registros DNS com criptografia
- Previne DNS spoofing/cache poisoning
- Cadeia de confiança: Root → TLD → Domínio
- Cada nível assina o abaixo

---

## 2. CDN (Content Delivery Network)

### Arquitetura
```
[Origin Server: us-east-1]
        ↓
[Edge Node: São Paulo]  ← usuários BR (baixa latência)
[Edge Node: Londres]    ← usuários UK
[Edge Node: Tóquio]     ← usuários JP
[Edge Node: Sydney]     ← usuários AU
```

### Pull vs Push
| | Pull (on-demand) | Push (pre-load) |
|---|-----------------|-----------------|
| Como | CDN busca do origin no primeiro request | Você faz upload para CDN |
| Cache | Automático | Você controla |
| Uso | Site dinâmico, assets | Arquivos grandes, versões específicas |

### Cache Strategies
- **TTL longo:** assets versionados (`app.abc123.js`) → 1 ano
- **TTL curto:** HTML, API responses → minutos
- **Cache invalidation:** purge via API, cache-busting (`?v=2`)
- **Stale-while-revalidate:** serve stale enquanto atualiza em background

### Key Players
| CDN | Destaque |
|-----|----------|
| CloudFront | AWS nativo, Lambda@Edge |
| Cloudflare | DDoS grátis, workers, tunnel |
| Akamai | Enterprise, maior rede |
| Fastly | VCL customizável, instant purge |
| Cloud CDN | Google Cloud |

### CDN + WAF + DDoS
CDN moderno é mais que cache: WAF, DDoS protection, bot management, edge compute (workers/functions).
