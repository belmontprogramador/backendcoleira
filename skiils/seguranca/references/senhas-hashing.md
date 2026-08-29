# Senhas, Hashing e Criptografia — Referência Detalhada

## 1. Encoding vs Encryption vs Tokenization vs Hashing

| | Encoding | Encryption | Tokenization | Hashing |
|---|----------|------------|--------------|---------|
| **Reversível?** | Sim | Sim (com chave) | Sim (lookup) | NÃO |
| **Propósito** | Formato | Confidencialidade | Compliance (PCI) | Verificação |
| **Exemplo** | Base64, URL encode | AES, RSA | Token de cartão | SHA-256, bcrypt |
| **Chave?** | Não | Sim | Sim (vault) | Não (ou salt) |
| **Seguro?** | NÃO (é só formato) | Sim | Sim | Sim (função lenta) |

**Encoding NÃO é segurança.** Base64 é só formato. JWT payload é encoded (base64), não criptografado.

---

## 2. Hashing de Senhas

### O Problema
Usuário define senha. Servidor NUNCA deve armazenar em plaintext. Se o DB vazar, senhas não podem ser recuperadas.

### A Solução — Funções Lentas

**bcrypt:**
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
 |  |  |__________________|__________________________________|
 |  |        Salt (22 chars)          Hash (31 chars)
 |  Cost (2^10 = 1024 rounds)
 Versão
```
- Cost factor: 2^cost iterações. Cost 10 = 1024 rounds. Cost 12 = 4096 (recomendado)
- bcrypt já inclui salt automaticamente. O hash final contém salt + versão + cost + hash

**Argon2 (Vencedor da competição de hashing de senhas, 2015):**
- **Argon2id (recomendado):** híbrido de Argon2d + Argon2i
- Parâmetros: memória, tempo, paralelismo
- Resistente a GPU/ASIC (usa muita memória, não só CPU)
- Se puder usar, use Argon2id

**PBKDF2 (Password-Based Key Derivation Function 2):**
- Mais antigo. NIST standard. Muitas iterações (100k+)
- Menos resistente a GPU que bcrypt/Argon2 (usa pouca memória)

### Salt vs Pepper
- **Salt:** aleatório POR usuário. Armazenado junto com hash (precisa para verificar)
- **Pepper:** secreto compartilhado para TODOS usuários. Armazenado SEPARADO (Vault, HSM, env var)
- `hash = bcrypt(senha + pepper, salt)`
- Se DB vazar: atacante tem salt + hash. Sem pepper, brute-force é muito mais difícil

### Fluxo Completo
```javascript
// Cadastro
const salt = await bcrypt.genSalt(12);
const hash = await bcrypt.hash(password + pepper, salt);
// Armazena hash (que já inclui o salt)

// Login
const user = await db.findUserByEmail(email);
const valid = await bcrypt.compare(password + pepper, user.hash);
if (!valid) throw new UnauthorizedError();
```

---

## 3. Criptografia Simétrica vs Assimétrica

### Simétrica (mesma chave para cifrar e decifrar)
| Algoritmo | Tamanho chave | Uso |
|-----------|---------------|-----|
| **AES-256-GCM** | 256 bits | Dados em repouso (DB, disco), TLS simétrico |
| **ChaCha20-Poly1305** | 256 bits | TLS, dispositivos mobile |

### Assimétrica (chave pública + privada)
| Algoritmo | Tamanho chave | Uso |
|-----------|---------------|-----|
| **RSA** | 2048-4096 bits | TLS, assinatura JWT, SSH |
| **ECDSA** | 256 bits | TLS moderno, assinatura (mais leve) |
| **Ed25519** | 256 bits | SSH, assinatura (mais rápido) |

### Na prática
- Simétrica: encriptar dados em repouso (AES-256-GCM)
- Assimétrica: handshake TLS, assinar JWT (RS256, ES256), SSH
- TLS usa AMBOS: assimétrica para trocar chave simétrica, simétrica para dados

---

## 4. Key Management

### Onde guardar chaves?
| Local | Segurança | Uso |
|-------|-----------|-----|
| Código/Config | PÉSSIMO | Nunca |
| Env vars | Baixo | Dev (jamais em produção) |
| Vault (HashiCorp) | Alto | Rotação automática, audit log |
| KMS (AWS) / Cloud KMS (GCP) | Alto | Chaves gerenciadas, HSM |
| HSM (Hardware Security Module) | Máximo | Compliance (PCI-DSS, FIPS) |

### Rotação de Chaves
- Chaves devem expirar e ser rotacionadas periodicamente
- Vault: rotação automática de credenciais de DB
- Overlap: nova chave ativa ANTES da antiga expirar (para não quebrar tokens existentes)

---

## 5. Checklist de Armazenamento de Dados Sensíveis

- [ ] Senhas: bcrypt/Argon2 com salt + pepper
- [ ] Dados sensíveis em repouso: AES-256-GCM
- [ ] Chaves de criptografia: Vault/KMS/HSM, nunca no código
- [ ] Tokens JWT: payload NÃO contém dados sensíveis (é encoded, não encrypted)
- [ ] Secrets rotacionados periodicamente
- [ ] Logs NÃO registram senhas, tokens, ou dados sensíveis
