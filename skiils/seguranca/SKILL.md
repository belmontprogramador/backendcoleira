---
name: seguranca
description: "HTTPS/TLS, hash de senhas (bcrypt, Argon2), ataques web (XSS, CSRF, SQLi), OWASP Top 10, zero-days históricos (Log4Shell, Heartbleed, Shellshock) e CVEs."
---

# Segurança

Cobre HTTPS/TLS (certificados, mTLS, cipher suites), armazenamento seguro de senhas (bcrypt, Argon2, salt/pepper), ataques web (XSS, CSRF, SQL Injection, OWASP Top 10) e zero-days históricos (Log4Shell, Heartbleed, Shellshock, Spring4Shell, ProxyLogon, Log4j, Follina).

**Para autenticação/autorização (OAuth 2.0, JWT, SSO, OIDC) → `../02-api-design`**
**Para segurança em cloud (IAM, WAF, VPC, CloudTrail) → `../04-cloud-devops`**

## Quando usar

- Configurando HTTPS/TLS ou mTLS
- Armazenando senhas com segurança
- Protegendo contra XSS, CSRF, SQL Injection
- Entendendo zero-days históricos e como se proteger

## Referências

| Arquivo | Conteúdo |
|---------|----------|
| [https-tls.md](references/https-tls.md) | TLS 1.3 handshake, certificados, mTLS, HSTS, cipher suites |
| [senhas-hashing.md](references/senhas-hashing.md) | bcrypt, scrypt, Argon2, salt, pepper, encoding vs encryption vs hashing |
| [ataques-web.md](references/ataques-web.md) | XSS (3 tipos), CSRF, SQLi, OWASP Top 10, CSP, security headers |
| [zero-day.md](references/zero-day.md) | Zero-days históricos: Log4Shell, Heartbleed, Shellshock, Spring4Shell, ProxyLogon, Follina |
