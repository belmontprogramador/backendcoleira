# Segurança

## 1. Segurança contra IDOR

Cenário:

```text
Usuário A
 ↓
PATCH /pets/B
```

O backend deve verificar:

```text
Pet B.owner_id === usuário A?
```

Se não:

```text
403
```

---

## 2. Rate Limit

Aplicar principalmente em:

```text
/login
/activation
/forgot-password
/contact
/public/*
```

---

## 3. Proteção do Código de Ativação

Após várias tentativas:

```text
bloqueio temporário
```

Além disso:

- logging;
- rate limiting;
- código single-use;
- hash.

---

## 4. Teste Crítico de Segurança

### Caso 1 — IDOR

Usuário A tenta alterar pet B.

Resultado:

```text
403
```

### Caso 2 — Feature não disponível

Usuário sem Premium acessa recurso Premium.

Resultado:

```text
403 FEATURE_NOT_AVAILABLE
```

### Caso 3 — Código já utilizado

Resultado:

```text
ACTIVATION_CODE_INVALID
```

### Caso 4 — Força bruta

Código sendo tentado milhares de vezes.

Resultado:

```text
RATE_LIMITED
```
