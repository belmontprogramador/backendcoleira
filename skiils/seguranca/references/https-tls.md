# HTTPS e TLS — Referência Detalhada

## 1. TLS Handshake (1.3 — Versão Atual)

```
Client                                    Server
  |                                          |
  |── ClientHello ────────────────────────→  |
  |   (TLS version, cipher suites,           |
  |    key_share: client's DH public key)     |
  |                                          |
  |   ←──── ServerHello + EncryptedExtensions |
  |        (cipher selected, server's DH key) |
  |   ←──── Certificate (server's identity)   |
  |   ←──── CertificateVerify (proof)         |
  |   ←──── Finished                          |
  |                                          |
  |── Finished ──────────────────────────→  |
  |                                          |
  |◄═══════ Encrypted Application Data ═══►|
```

**TLS 1.3 reduziu de 2 RTTs → 1 RTT (às vezes 0-RTT).** Menos latência, mais segurança (removeu cipher suites fracos, RSA key exchange).

### O que Acontece
1. **Negociação:** cliente e servidor acordam versão TLS + cipher suite
2. **Autenticação:** servidor apresenta certificado (assinado por CA). Cliente verifica cadeia de confiança
3. **Troca de chaves:** Diffie-Hellman (ECDHE) gera chave de sessão efêmera
4. **Comunicação criptografada:** chave simétrica (AES-GCM, ChaCha20-Poly1305)

---

## 2. Certificados

### Tipos
| Tipo | Validação | Exemplo de Uso |
|------|-----------|----------------|
| **DV (Domain Validation)** | Só controla o domínio | Blogs, sites pessoais |
| **OV (Organization Validation)** | CA verifica empresa | Empresas, e-commerce |
| **EV (Extended Validation)** | Verificação rigorosa | Bancos, governo (barra verde) |
| **Wildcard** | `*.exemplo.com` | Múltiplos subdomínios |
| **SAN (Subject Alternative Name)** | Múltiplos domínios | `exemplo.com`, `exemplo.com.br` |

### Cadeia de Confiança
```
Root CA (pré-instalada no OS/browser)
  ↓ assina
Intermediate CA
  ↓ assina
Server Certificate (seu site)
```
Se qualquer elo for inválido → browser mostra aviso.

### Let's Encrypt
- Certificados DV gratuitos. Renew automático (90 dias). ACME protocol.
- **Ferramentas:** certbot, acme.sh, Caddy (automático)

---

## 3. mTLS (Mutual TLS)

TLS padrão = servidor se autentica. mTLS = AMBOS se autenticam.

```
Client ──cert──→ Server
Client ←──cert── Server
```

### Casos de Uso
- **Service mesh:** comunicação entre serviços com mTLS automático (Istio, Linkerd)
- **Zero Trust:** cada serviço valida identidade do outro
- **API banking:** Open Banking, PSD2 exigem mTLS

### Implementação (K8s + Istio)
Sem código. Istio sidecar gerencia certificados e mTLS automaticamente.

---

## 4. HSTS (HTTP Strict Transport Security)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- Browser FORÇA HTTPS para este domínio por 1 ano
- `includeSubDomains`: todos subdomínios também
- `preload`: submete para lista de preload do Chrome/Firefox (nunca mais HTTP)

### Perigo: HSTS + certificado expirado = site offline. Sempre renove.

---

## 5. Cipher Suites

```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
 |    |    |         |        |      └─ HMAC (integridade)
 |    |    |         |        └─ Modo de operação (GCM = authenticated encryption)
 |    |    |         └─ Cipher simétrico (AES-128)
 |    |    └─ Key exchange (RSA — evite; ECDHE é melhor)
 |    └─ Autenticação (RSA, ECDSA)
 └─ Protocolo
```

### Recomendações Modernas
- **Preferir:** `ECDHE + AES-GCM` ou `ChaCha20-Poly1305`
- **Forward secrecy:** ECDHE garante que chaves passadas não sejam comprometidas se a chave privada vazar
- **Evitar:** RSA key exchange (sem forward secrecy), CBC, 3DES, RC4

---

## 6. HTTPS na Prática

### Configuração Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name exemplo.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;  # TLS 1.0/1.1 descontinuados
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

### SSL Labs Test
Sempre rode `https://www.ssllabs.com/ssltest/` após configurar TLS. Busque rating A+.
