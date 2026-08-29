# Infraestrutura, Cache e Escalabilidade

## 1. Redis

Redis será utilizado para:

- cache;
- rate limit;
- sessões;
- tokens temporários;
- locks;
- filas;
- códigos temporários.

PostgreSQL continua sendo a fonte da verdade.

---

## 2. Cache do Perfil

```text
GET /public/pets/7F4K9M2Q
          ↓
        Redis
       ↙     ↘
     HIT     MISS
      ↓        ↓
   retorna   PostgreSQL
                ↓
              Redis
```

Ao editar:

```text
UPDATE
 ↓
INVALIDATE CACHE
```

---

## 3. Filas

Usar filas para:

- e-mail;
- WhatsApp;
- SMS;
- push;
- processamento de imagens;
- notificações;
- relatórios.

---

## 4. Storage

Fotos não ficam no PostgreSQL.

Usar:

```text
S3
R2
```

ou equivalente.

Banco:

```text
photo_url
```

---

## 5. Processamento de Imagem

```text
Upload
 ↓
Validação
 ↓
Resize
 ↓
Compressão
 ↓
Storage
 ↓
URL
```

Limitar:

- tamanho;
- MIME;
- extensão;
- dimensões.

---

## 6. Escalabilidade

Arquitetura inicial:

```text
              CDN
               ↓
         Load Balancer
               ↓
       ┌───────┴───────┐
       ↓               ↓
     API 1           API 2
       │               │
       └───────┬───────┘
               ↓
          PostgreSQL
               +
             Redis
               +
          Object Storage
```

Posteriormente:

```text
API x N
Workers x N
Read Replicas
Redis Cluster
Queue
CDN
```

---

## 7. Princípio de Resiliência

Se WhatsApp falhar:

```text
→ e-mail
```

Se analytics falhar:

```text
→ perfil continua
```

Se notificações falharem:

```text
→ perfil continua
```

A função central nunca pode parar:

```text
IDENTIFICAR
↓
CONTATAR
```

---

## 8. Métricas

O sistema deverá acompanhar:

```text
tags_produced
tags_activated
activation_rate
profiles_viewed
nfc_scans
qr_scans
lost_pets
contacts_sent
location_shares
premium_users
conversion_rate
churn
MRR
```
