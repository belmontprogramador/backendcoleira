# Autenticacao de APIs — Referencia Detalhada

## 1. Session-Based Authentication

**Fluxo:**
1. Cliente envia credenciais (email + senha)
2. Servidor valida, cria sessao (armazenada server-side: Redis, DB)
3. Servidor retorna cookie com `session_id`
4. Cliente envia cookie em toda requisicao
5. Servidor consulta sessao a cada requisicao

**Vantagens:** revogacao imediata, cookie HttpOnly protege contra XSS
**Desvantagens:** estado no servidor, sticky sessions ou shared store, ruim para mobile

---

## 2. JWT (JSON Web Token)

### Estrutura
```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.signature
|------- Header ------|-- Payload --|- Signature -|
```
- **Header:** algoritmo (`HS256`, `RS256`)
- **Payload:** claims — `sub` (user ID), `name`, `iat`, `exp`
- **Signature:** `HMAC-SHA256(base64(header).base64(payload), secret)`

### Fluxo
1. Login → servidor gera JWT assinado
2. Cliente armazena e envia: `Authorization: Bearer <token>`
3. Servidor valida assinatura (sem consulta ao DB!)

### Access Token vs Refresh Token
| | Access Token | Refresh Token |
|---|-------------|---------------|
| Vida | Curta (5-15 min) | Longa (7-30 dias) |
| Uso | Acessar recursos | Obter novo access token |
| Armazenamento | Memoria (SPA) | Cookie HttpOnly |

### Vantagens do JWT
- Stateless: sem consulta ao DB
- Cross-domain, mobile-friendly

### Desvantagens
- Revogacao dificil (token valido ate expirar)
- Payload e base64, NAO criptografado — nunca dados sensiveis
- Ataque `alg: none` (servidor precisa rejeitar)
- Tamanho maior que session_id

---

## 3. OAuth 2.0

### Personagens
- **Resource Owner:** usuario
- **Client:** aplicacao querendo acesso
- **Authorization Server:** emite tokens
- **Resource Server:** API protegida
- **Scope:** permissoes (`read:email`, `write:posts`)

### Grant Types

**Authorization Code + PKCE (mais seguro)**
```
User → Client → Auth Server (login) → Auth Code → Client
Client → Auth Server (code + code_verifier) → Access + Refresh Token
```
PKCE: `code_verifier` (random) + `code_challenge` (hash). Auth code so trocado com verifier correto.
Para apps com backend. PKCE obrigatorio para mobile/SPA.

**Client Credentials**
```
Client → Auth Server (client_id + secret) → Access Token
```
Machine-to-machine. Ex: servico de backup acessando API de storage.

**Device Code**
```
Device → Auth Server → device_code + user_code + URL
User abre URL no celular, digita code, autoriza
Device → polling → Access Token
```
Smart TVs, IoT, CLI. Ex: GitHub CLI, YouTube na TV.

**Implicit — DEPRECATED, NAO USE.** Token na URL. Substituido por Auth Code + PKCE.

**Resource Owner Password — EVITAR.** Credenciais direto para o Client.

---

## 4. API Keys

- Chave unica por cliente: `X-API-Key: abc123` ou `?api_key=abc123`
- Simples, mas nao e autenticacao de usuario — e identificacao de app
- Se vazar, qualquer um usa
- Permitir multiplas keys para rotacao, limitar escopo, rate limit

---

## 5. CORS (Cross-Origin Resource Sharing)

Browser bloqueia cross-origin por padrao.
**Preflight:** `OPTIONS` → servidor responde com headers → se OK, request real.

```http
Access-Control-Allow-Origin: https://meusite.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

## 6. Metodos de Autenticacao

| Metodo | Header | Uso |
|--------|--------|-----|
| Basic Auth | `Authorization: Basic base64(user:senha)` | So HTTPS |
| Bearer Token | `Authorization: Bearer <jwt>` | Moderno |
| API Key | `X-API-Key: key123` | Server-to-server |
| OAuth 2.0 | `Authorization: Bearer <access_token>` | Delegacao |
| mTLS | Certificado cliente + servidor | Zero trust interno |

---

## 7. Checklist de Seguranca

- HTTPS em tudo (TLS 1.2+)
- Tokens com expiracao curta (access: 15min, refresh: 7d)
- Tokens NUNCA em URL (vaza em logs, proxies)
- Rate limiting por IP, key e usuario
- Input validation em todos endpoints
- CORS restritivo (nao `*` com credentials)
- Security headers: HSTS, X-Content-Type-Options
- Log de todas tentativas de auth
- Rotacao de segredos com overlap
