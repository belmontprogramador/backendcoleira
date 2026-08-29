# Ataques Web e OWASP — Referencia Detalhada

## 1. XSS (Cross-Site Scripting)

**Stored XSS:** script armazenado no servidor (comentario, perfil). Toda visita executa.
**Reflected XSS:** script injetado via URL/parametro. Servidor reflete na resposta.
**DOM-based XSS:** manipulacao do DOM no cliente. Servidor nunca ve.

### Prevencao
1. Output Encoding (&lt; &gt; &quot;)
2. Sanitizacao de input (DOMPurify)
3. CSP: `Content-Security-Policy: default-src &#39self&#39; script-src &#39self&#39 &#39nonce-abc123&#39`
4. Cookies HttpOnly (JS nao acessa)
5. Frameworks modernos escapam por padrao (React, Angular)

## 2. CSRF (Cross-Site Request Forgery)

Usuario logado visita site malicioso -> POST cross-site -> browser envia cookie -> acao indesejada.

### Prevencao
1. CSRF Token (unico por sessao, campo hidden)
2. SameSite Cookies: `Set-Cookie: ...; SameSite=Strict`
3. Origin/Referer validation
4. Custom Headers (nao triggeraveis por form HTML)

## 3. SQL Injection

```sql
-- Input: &#39 OR &#391&#39=&#391&#39 --
SELECT * FROM users WHERE username = &#39&#39 OR &#391&#39=&#391&#39 --&#39 AND password = ...
```
Login bypass com condicao sempre verdadeira.

### Prevencao
```javascript
// NUNCA concatenacao
db.query(`SELECT * FROM users WHERE username = &#39${username}&#39`);

// SEMPRE parameterized queries
db.query(&#39SELECT * FROM users WHERE username = $1&#39, [username]);
```
ORM nao e bala de prata. Raw queries precisam de parametrizacao.

## 4. OWASP Top 10

1. Broken Access Control -> validar permissao em TODO endpoint
2. Cryptographic Failures -> TLS 1.3, bcrypt, nao inventar cripto
3. Injection -> parameterized queries, input validation
4. Insecure Design -> threat modeling
5. Security Misconfiguration -> IaC scan, hardening
6. Vulnerable Components -> SCA (Snyk), SBOM
7. Auth Failures -> MFA, bcrypt, rate limiting
8. Software Integrity -> assinar artefatos
9. Logging Failures -> centralizar logs, alertas
10. SSRF -> validar URLs, evitar requests arbitrarios

## 5. CSP (Content Security Policy)
```
Content-Security-Policy:
  default-src &#39self&#39;
  script-src &#39self&#39 &#39nonce-abc123&#39
  frame-ancestors &#39none&#39
  form-action &#39self&#39
```

## 6. Security Headers Essenciais
```http
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src &#39self&#39
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```
