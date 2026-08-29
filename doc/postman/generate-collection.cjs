/**
 * Gera a coleção Postman COMPLETA do Coleira Cachorro (todas as 71 rotas).
 *
 * Uso: `node doc/postman/generate-collection.cjs`
 * Saída: `doc/postman/coleira-cachorro-api.postman_collection.json`
 */
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'coleira-cachorro-api.postman_collection.json')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Asserção simples de status code. */
const st = (code) => [`pm.test('status ${code}', () => pm.response.to.have.status(${code}));`]

/**
 * Monta um item de request.
 * @param {string} name
 * @param {string} method
 * @param {string} p       caminho (sem base_url), ex.: '/pets/{{pet_id}}'
 * @param {object} opts
 *   auth     → inclui Authorization: Bearer {{access_token}} (default true)
 *   body     → string JSON crua (envia como application/json)
 *   query    → array [{key, value}]
 *   tests    → array de linhas JS (test script)
 *   pre      → array de linhas JS (pre-request script)
 *   formdata → array form-data (modo multipart)
 *   headers  → array extra de headers
 */
function req(name, method, p, opts = {}) {
  const { auth = true, body, query, tests, pre, formdata, headers = [] } = opts

  const header = []
  if (auth) header.push({ key: 'Authorization', value: 'Bearer {{access_token}}' })
  if (body && !formdata) header.push({ key: 'Content-Type', value: 'application/json' })
  header.push(...headers)

  const url = {
    raw: '{{base_url}}' + p,
    host: ['{{base_url}}'],
    path: p.split('/').filter(Boolean),
  }
  if (query) url.query = query

  const request = { method, header, url }
  if (formdata) {
    request.body = { mode: 'formdata', formdata }
  } else if (body) {
    request.body = { mode: 'raw', raw: body }
  }

  const item = { name, request }
  if (tests) item.event = [{ listen: 'test', script: { exec: tests, type: 'text/javascript' } }]
  if (pre) {
    item.event = [
      ...(item.event || []),
      { listen: 'prerequest', script: { exec: pre, type: 'text/javascript' } },
    ]
  }
  return item
}

const folder = (name, items, desc) => {
  const f = { name, item: items }
  if (desc) f.description = desc
  return f
}

// ---------------------------------------------------------------------------
// Scripts reutilizáveis
// ---------------------------------------------------------------------------
const setTokens = [
  "pm.test('status 200', () => pm.response.to.have.status(200));",
  'const body = pm.response.json();',
  "pm.test('retorna tokens', () => { pm.expect(body).to.have.property('accessToken'); pm.expect(body).to.have.property('refreshToken'); });",
  "pm.collectionVariables.set('access_token', body.accessToken);",
  "pm.collectionVariables.set('refresh_token', body.refreshToken);",
]

const setPetId = [
  "pm.test('status 201', () => pm.response.to.have.status(201));",
  "pm.collectionVariables.set('pet_id', pm.response.json().id);",
]

const setBatchId = [
  "pm.test('status 201', () => pm.response.to.have.status(201));",
  "pm.collectionVariables.set('batch_id', pm.response.json().id);",
]

const setPlanId = [
  "pm.test('status 200', () => pm.response.to.have.status(200));",
  "const premium = pm.response.json().find(p => p.code === 'PREMIUM');",
  "if (premium) pm.collectionVariables.set('plan_id', premium.id);",
]

const setTagIds = [
  "pm.test('status 200', () => pm.response.to.have.status(200));",
  "const body = pm.response.json();",
  "pm.collectionVariables.set('tag_public_id', body.publicId);",
  "pm.collectionVariables.set('tag_id', body.id);",
]

// ---------------------------------------------------------------------------
// Coleção
// ---------------------------------------------------------------------------
const items = [
  folder('1. Health & Info (público)', [
    req('GET / — raiz', 'GET', '/', { auth: false, tests: st(200) }),
    req('GET /health — health check', 'GET', '/health', { auth: false, tests: st(200) }),
  ]),

  folder('2. Auth (público)', [
    req('POST /auth/register — criar conta', 'POST', '/auth/register', {
      auth: false,
      body: '{\n  "name": "João Silva",\n  "email": "joao@email.com",\n  "password": "senhaForte123",\n  "phone": "+5521999999999"\n}',
      tests: ["pm.test('status 201', () => pm.response.to.have.status(201));", "pm.test('retorna id', () => pm.expect(pm.response.json()).to.have.property('id'));"],
    }),
    req('POST /auth/login — login (seed superadmin)', 'POST', '/auth/login', {
      auth: false,
      body: '{\n  "email": "superadmin@coleira.com",\n  "password": "SuperAdmin@Dev123!"\n}',
      tests: setTokens,
    }),
    req('POST /auth/refresh — rotacionar tokens', 'POST', '/auth/refresh', {
      auth: false,
      body: '{\n  "refreshToken": "{{refresh_token}}"\n}',
      tests: [
        "pm.test('status 200', () => pm.response.to.have.status(200));",
        'const body = pm.response.json();',
        "pm.collectionVariables.set('access_token', body.accessToken);",
        "pm.collectionVariables.set('refresh_token', body.refreshToken);",
      ],
    }),
    req('POST /auth/logout', 'POST', '/auth/logout', {
      auth: false,
      body: '{\n  "refreshToken": "{{refresh_token}}"\n}',
      tests: st(204),
    }),
    req('POST /auth/verify-email', 'POST', '/auth/verify-email', {
      auth: false,
      body: '{\n  "token": "{{verify_token}}"\n}',
      tests: st(204),
    }),
    req('POST /auth/forgot-password', 'POST', '/auth/forgot-password', {
      auth: false,
      body: '{\n  "email": "joao@email.com"\n}',
      tests: st(204),
    }),
    req('POST /auth/reset-password', 'POST', '/auth/reset-password', {
      auth: false,
      body: '{\n  "token": "{{reset_token}}",\n  "newPassword": "novaSenha456"\n}',
      tests: st(204),
    }),
  ]),

  folder('3. Me (autenticado)', [
    req('GET /users/me — meu perfil', 'GET', '/users/me', {
      tests: ["pm.test('status 200', () => pm.response.to.have.status(200));", "pm.test('não vaza password_hash', () => pm.expect(pm.response.json()).to.not.have.property('password_hash'));"],
    }),
    req('PATCH /users/me — atualizar perfil', 'PATCH', '/users/me', {
      body: '{\n  "name": "João S.",\n  "phone": "+5521988887777"\n}',
      tests: st(200),
    }),
    req('PATCH /users/me/password — alterar senha', 'PATCH', '/users/me/password', {
      body: '{\n  "currentPassword": "senhaForte123",\n  "newPassword": "novaSenha456"\n}',
      tests: st(204),
    }),
    req('DELETE /users/me — desativar minha conta', 'DELETE', '/users/me', {
      tests: st(204),
    }),
  ]),

  folder('4. Admin — Usuários & RBAC', [
    req('GET /admin/users — listar (ADMIN+)', 'GET', '/admin/users', {
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' },
      ],
      tests: st(200),
    }),
    req('POST /admin/users — criar admin/super admin (só SUPER_ADMIN)', 'POST', '/admin/users', {
      body: '{\n  "name": "Novo Admin",\n  "email": "novoadmin@email.com",\n  "password": "senhaForte123",\n  "role": "ADMIN"\n}',
      tests: st(201),
    }),
    req('GET /admin/users/{{user_id}} — detalhar (ADMIN+)', 'GET', '/admin/users/{{user_id}}', { tests: st(200) }),
    req('PATCH /admin/users/{{user_id}} — editar nome/telefone (ADMIN+)', 'PATCH', '/admin/users/{{user_id}}', {
      body: '{\n  "name": "Cliente Editado",\n  "phone": "+5521988880000"\n}',
      tests: st(200),
    }),
    req('DELETE /admin/users/{{user_id}} — soft delete (ADMIN+)', 'DELETE', '/admin/users/{{user_id}}', { tests: st(204) }),
    req('PATCH /admin/users/{{user_id}}/status — bloquear/ativar', 'PATCH', '/admin/users/{{user_id}}/status', {
      body: '{\n  "status": "BLOCKED"\n}',
      tests: st(200),
    }),
    req('PATCH /admin/users/{{user_id}}/role — alterar role (só SUPER_ADMIN)', 'PATCH', '/admin/users/{{user_id}}/role', {
      body: '{\n  "role": "OPERATOR"\n}',
      tests: st(200),
    }),
  ]),

  folder('5. Pets (autenticado)', [
    req('GET /pets — listar meus pets', 'GET', '/pets', { tests: st(200) }),
    req('POST /pets — criar pet', 'POST', '/pets', {
      body: '{\n  "name": "Thor",\n  "species": "Cão",\n  "breed": "Shih Tzu",\n  "sex": "MALE",\n  "birthDate": "2022-05-10T00:00:00.000Z",\n  "description": "Muito carinhoso",\n  "city": "Araruama"\n}',
      tests: setPetId,
    }),
    req('GET /pets/{{pet_id}} — detalhar', 'GET', '/pets/{{pet_id}}', { tests: st(200) }),
    req('PATCH /pets/{{pet_id}} — atualizar', 'PATCH', '/pets/{{pet_id}}', {
      body: '{\n  "description": "Muito carinhoso e brincalhão",\n  "city": "Cabo Frio"\n}',
      tests: st(200),
    }),
    req('DELETE /pets/{{pet_id}} — soft delete', 'DELETE', '/pets/{{pet_id}}', { tests: st(204) }),
    req('POST /pets/{{pet_id}}/lost — marcar perdido', 'POST', '/pets/{{pet_id}}/lost', { tests: st(201) }),
    req('POST /pets/{{pet_id}}/found — marcar encontrado', 'POST', '/pets/{{pet_id}}/found', { tests: st(201) }),
    req('GET /pets/{{pet_id}}/privacy — ver privacidade', 'GET', '/pets/{{pet_id}}/privacy', { tests: st(200) }),
    req('PATCH /pets/{{pet_id}}/privacy — atualizar privacidade', 'PATCH', '/pets/{{pet_id}}/privacy', {
      body: '{\n  "showEmail": true,\n  "showMedical": false\n}',
      tests: st(200),
    }),
    req('POST /pets/{{pet_id}}/photo — upload de foto (multipart)', 'POST', '/pets/{{pet_id}}/photo', {
      formdata: [{ key: 'photo', type: 'file', src: [] }],
      tests: st(201),
    }),
  ]),

  folder('6. Admin Pets (ADMIN)', [
    req('GET /admin/pets — listar todos os pets', 'GET', '/admin/pets', {
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' },
      ],
      tests: st(200),
    }),
    req('GET /admin/pets/{{pet_id}} — detalhar qualquer pet', 'GET', '/admin/pets/{{pet_id}}', { tests: st(200) }),
  ]),

  folder('7. Produção NFC — Lotes (OPERATOR/ADMIN)', [
    req('POST /admin/batches — criar lote', 'POST', '/admin/batches', {
      body: '{\n  "name": "Lote 001",\n  "quantity": 100,\n  "description": "Produção inicial",\n  "prefix": "LT1",\n  "externalRef": "REF-001"\n}',
      tests: setBatchId,
    }),
    req('GET /admin/batches/{{batch_id}} — detalhar lote', 'GET', '/admin/batches/{{batch_id}}', { tests: st(200) }),
    req('POST /admin/batches/{{batch_id}}/generate — gerar tags (retorna códigos UMA vez)', 'POST', '/admin/batches/{{batch_id}}/generate', {
      tests: ["pm.test('status 201', () => pm.response.to.have.status(201));", "if (pm.response.json().codes?.length) pm.collectionVariables.set('first_code', pm.response.json().codes[0]);"],
    }),
    req('POST /admin/batches/{{batch_id}}/complete — finalizar lote', 'POST', '/admin/batches/{{batch_id}}/complete', { tests: st(201) }),
    req('DELETE /admin/batches/{{batch_id}} — cancelar lote', 'DELETE', '/admin/batches/{{batch_id}}', {
      body: '{\n  "reason": "Lote incorreto"\n}',
      tests: st(200),
    }),
  ]),

  folder('8. Produção NFC — Tags (OPERATOR)', [
    req('GET /admin/tags — listar tags', 'GET', '/admin/tags', {
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' },
        { key: 'batchId', value: '{{batch_id}}' },
      ],
      tests: st(200),
    }),
    req('GET /admin/tags/next-to-write — próxima tag a gravar', 'GET', '/admin/tags/next-to-write', {
      query: [{ key: 'batchId', value: '{{batch_id}}' }],
      tests: st(200),
    }),
    req('GET /admin/tags/{{tag_public_id}} — detalhar tag', 'GET', '/admin/tags/{{tag_public_id}}', { tests: st(200) }),
    req('POST /admin/tags/write — gravar NFC (só OPERATOR)', 'POST', '/admin/tags/write', {
      body: '{\n  "publicId": "{{tag_public_id}}",\n  "uid": "04:A7:32:91:8B:1F"\n}',
      tests: st(201),
    }),
    req('POST /admin/tags/verify — verificar gravação (só OPERATOR)', 'POST', '/admin/tags/verify', {
      body: '{\n  "publicId": "{{tag_public_id}}",\n  "uid": "04:A7:32:91:8B:1F"\n}',
      tests: st(201),
    }),
    req('POST /admin/tags/report — reportar gravação (só OPERATOR)', 'POST', '/admin/tags/report', {
      body: '{\n  "publicId": "{{tag_public_id}}",\n  "uid": "04:A7:32:91:8B:1F",\n  "matched": true\n}',
      tests: st(201),
    }),
    req('POST /admin/tags/{{tag_public_id}}/reset — resetar tag (só OPERATOR)', 'POST', '/admin/tags/{{tag_public_id}}/reset', { tests: st(201) }),
    req('POST /admin/tags/{{tag_public_id}}/reprint-code — reimprimir código de ativação', 'POST', '/admin/tags/{{tag_public_id}}/reprint-code', { tests: st(201) }),
    req('POST /admin/tags/{{tag_public_id}}/qr — gerar QR (PNG)', 'POST', '/admin/tags/{{tag_public_id}}/qr', { tests: st(200) }),
  ]),

  folder('9. Ativação & Ownership', [
    req('GET /nfc/{{tag_public_id}} — status do pingente (público)', 'GET', '/nfc/{{tag_public_id}}', {
      auth: false,
      tests: setTagIds,
    }),
    req('POST /nfc/{{tag_public_id}}/activate — ativar pingente', 'POST', '/nfc/{{tag_public_id}}/activate', {
      body: '{\n  "activationCode": "X8P4-L2Q9"\n}',
      tests: st(201),
    }),
    req('POST /nfc/{{tag_id}}/associate-pet — associar pet', 'POST', '/nfc/{{tag_id}}/associate-pet', {
      body: '{\n  "petId": "{{pet_id}}"\n}',
      tests: st(201),
    }),
    req('POST /nfc/{{tag_id}}/disassociate-pet — desassociar pet', 'POST', '/nfc/{{tag_id}}/disassociate-pet', { tests: st(201) }),
    req('POST /nfc/{{tag_id}}/transfer — solicitar transferência', 'POST', '/nfc/{{tag_id}}/transfer', {
      body: '{\n  "toEmail": "destinatario@email.com"\n}',
      tests: st(201),
    }),
    req('POST /nfc/transfer/accept — aceitar transferência', 'POST', '/nfc/transfer/accept', {
      body: '{\n  "token": "{{transfer_token}}"\n}',
      tests: st(201),
    }),
    req('POST /nfc/{{tag_id}}/unlink — desvincular pingente', 'POST', '/nfc/{{tag_id}}/unlink', { tests: st(201) }),
    req('POST /nfc/{{tag_id}}/replace — substituir pingente', 'POST', '/nfc/{{tag_id}}/replace', {
      body: '{\n  "newTagId": "{{new_tag_id}}"\n}',
      tests: st(201),
    }),
  ], '⚠️ Dois identificadores distintos:\n' +
     '- `tag_public_id` (8 chars, ex. 7F4K9M2Q) → status/activate/rotas de admin tags.\n' +
     '- `tag_id` (id interno do banco) → associate/disassociate/transfer/unlink/replace.\n' +
     'O `tag_id` é preenchido automaticamente pelo "GET /nfc/{{tag_public_id}}" (campo `id`).'),

  folder('10. Perfil Público (sem auth)', [
    req('GET /p/{{tag_public_id}} — perfil público do pet', 'GET', '/p/{{tag_public_id}}', {
      auth: false,
      query: [{ key: 'source', value: 'qr' }],
      tests: [
        "pm.test('status 200', () => pm.response.to.have.status(200));",
        "pm.test('não vaza activation_code', () => pm.expect(pm.response.json()).to.not.have.property('activation_code_encrypted'));",
      ],
    }),
  ]),

  folder('11. Contato (inbox)', [
    req('POST /p/{{tag_public_id}}/contact — visitante envia mensagem (público)', 'POST', '/p/{{tag_public_id}}/contact', {
      auth: false,
      body: '{\n  "message": "Achei seu cachorro na praça!",\n  "sender_name": "Ana",\n  "sender_phone": "(21) 98888-7777",\n  "sender_email": "ana@example.com",\n  "source": "qr"\n}',
      tests: ["pm.test('status 201', () => pm.response.to.have.status(201));", "pm.collectionVariables.set('message_id', pm.response.json().messageId);"],
    }),
    req('GET /contacts — inbox do tutor', 'GET', '/contacts', {
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' },
      ],
      tests: st(200),
    }),
    req('GET /contacts/{{message_id}} — detalhar mensagem', 'GET', '/contacts/{{message_id}}', { tests: st(200) }),
    req('PATCH /contacts/{{message_id}}/read — marcar como lida', 'PATCH', '/contacts/{{message_id}}/read', { tests: st(200) }),
  ]),

  folder('12. Assinaturas & Premium (Fase 7)', [
    req('GET /plans — catálogo de planos (JWT)', 'GET', '/plans', { tests: setPlanId }),
    req('GET /subscriptions/current — assinatura atual', 'GET', '/subscriptions/current', { tests: st(200) }),
    req('POST /subscriptions/checkout — iniciar checkout (PIX)', 'POST', '/subscriptions/checkout', {
      body: '{\n  "planId": "{{plan_id}}",\n  "paymentMethod": "PIX"\n}',
      tests: ["pm.test('status 201', () => pm.response.to.have.status(201));", "if (pm.response.json().providerPaymentId) pm.collectionVariables.set('provider_payment_id', pm.response.json().providerPaymentId);"],
    }),
    req('POST /webhooks/payment — webhook Mercado Pago (approved)', 'POST', '/webhooks/payment', {
      auth: false,
      body: '{\n  "event_id": "{{$guid}}",\n  "event_type": "payment.updated",\n  "payment_id": "{{provider_payment_id}}",\n  "status": "approved"\n}',
      pre: [
        "const secret = pm.collectionVariables.get('mp_webhook_secret');",
        "const raw = pm.request.body.raw;",
        "const sig = CryptoJS.HmacSHA256(raw, secret).toString(CryptoJS.enc.Hex);",
        "pm.request.headers.upsert({ key: 'X-Signature', value: sig });",
      ],
      tests: st(201),
    }),
    req('POST /subscriptions/cancel — cancelar assinatura', 'POST', '/subscriptions/cancel', { tests: st(201) }),
    req('GET /pets/{{pet_id}}/medical — dados médicos', 'GET', '/pets/{{pet_id}}/medical', { tests: st(200) }),
    req('PUT /pets/{{pet_id}}/medical — atualizar dados médicos', 'PUT', '/pets/{{pet_id}}/medical', {
      body: '{\n  "allergies": "pólen",\n  "veterinarianName": "Dr. Ana"\n}',
      tests: st(200),
    }),
    req('GET /pets/{{pet_id}}/contacts — listar contatos do pet', 'GET', '/pets/{{pet_id}}/contacts', { tests: st(200) }),
    req('POST /pets/{{pet_id}}/contacts — criar contato', 'POST', '/pets/{{pet_id}}/contacts', {
      body: '{\n  "name": "Maria",\n  "phone": "+5521999998888",\n  "email": "maria@email.com",\n  "relationship": "Mãe",\n  "isPrimary": true\n}',
      tests: ["pm.test('status 201', () => pm.response.to.have.status(201));", "pm.collectionVariables.set('contact_id', pm.response.json().id);"],
    }),
    req('PATCH /pets/{{pet_id}}/contacts/{{contact_id}} — atualizar contato', 'PATCH', '/pets/{{pet_id}}/contacts/{{contact_id}}', {
      body: '{\n  "name": "Maria S."\n}',
      tests: st(200),
    }),
    req('DELETE /pets/{{pet_id}}/contacts/{{contact_id}} — excluir contato', 'DELETE', '/pets/{{pet_id}}/contacts/{{contact_id}}', { tests: st(204) }),
    req('GET /pets/{{pet_id}}/access-events — histórico de acessos', 'GET', '/pets/{{pet_id}}/access-events', { tests: st(200) }),
  ]),
]

const collection = {
  info: {
    name: 'Coleira Cachorro — API Completa',
    description:
      'Coleção 100% completa do Coleira Cachorro (NestJS + Prisma 7 + Postgres + Redis).\n' +
      'Todas as 71 rotas, agrupadas por módulo, com auth, bodies e exemplos.\n\n' +
      'Base URL: http://localhost:3000 (variável `base_url`).\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'FLUXO RECOMENDADO\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '1. Rode o seed: `npm run prisma:seed`\n' +
      '2. `POST /auth/login` (superadmin) → preenche `access_token`/`refresh_token` automaticamente.\n' +
      '3. `POST /pets` → preenche `pet_id`.\n' +
      '4. Produção NFC: `POST /admin/batches` → `POST /generate` → grava/verifica → `GET /nfc/:publicId` (preenche `tag_id`).\n' +
      '5. Ativação/Ownership, Contato, Assinaturas (Premium) usam `pet_id`/`tag_id`.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'SEED (senhas vêm do .env)\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '  SUPER_ADMIN: superadmin@coleira.com / SuperAdmin@Dev123!\n' +
      '  ADMIN:       admin@coleira.com      / Admin@Dev123!\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'PERMISSÕES POR ROTA (RBAC)\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '  USER          → /users/me, /pets, /nfc (ativação/ownership), /contacts, /subscriptions, /p (perfil/contato)\n' +
      '  SUPPORT       → leitura limitada (user:read, pet:read, tag:read)\n' +
      '  OPERATOR      → /admin/tags (gravação NFC: tag:record), /admin/batches (batch:manage)\n' +
      '  ADMIN         → /admin/users (exceto role), /admin/pets, /admin/batches\n' +
      '  SUPER_ADMIN   → tudo + /admin/users (criar admin/super), /admin/users/:id/role\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'NOTAS (sem SMTP configurado)\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'O envio de email usa LogEmailSender (loga no console, não envia email real).\n' +
      'Para fluxos que dependem de email, copie o token do log do servidor:\n' +
      '  • [verificação de e-mail] ... token=<hex64>  → cole em `verify_token`\n' +
      '  • [recuperação de senha] ... token=<hex64>   → cole em `reset_token`\n\n' +
      'Webhook: preencha `mp_webhook_secret` com o MESMO valor de `MERCADO_PAGO_WEBHOOK_SECRET`\n' +
      'do .env. O pre-request script calcula o HMAC-SHA256 do body e injeta o header `X-Signature`.\n\n' +
      'Variáveis de ambiente da coleção:\n' +
      '  base_url          → http://localhost:3000\n' +
      '  access_token      → preenchido no login\n' +
      '  refresh_token     → preenchido no login\n' +
      '  verify_token      → token de verificação (copiar do log)\n' +
      '  reset_token       → token de reset (copiar do log)\n' +
      '  pet_id            → preenchido ao criar pet\n' +
      '  batch_id          → preenchido ao criar lote\n' +
      '  tag_public_id     → public ID (8 chars) — status/activate/admin tags\n' +
      '  tag_id            → id interno do banco — associate/disassociate/transfer/unlink/replace\n' +
      '  message_id        → preenchido ao enviar contato\n' +
      '  contact_id        → preenchido ao criar contato\n' +
      '  plan_id           → preenchido ao listar planos\n' +
      '  provider_payment_id → preenchido no checkout\n' +
      '  mp_webhook_secret → = MERCADO_PAGO_WEBHOOK_SECRET (para assinar webhook)',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'base_url', value: 'http://localhost:3000' },
    { key: 'access_token', value: '' },
    { key: 'refresh_token', value: '' },
    { key: 'verify_token', value: '' },
    { key: 'reset_token', value: '' },
    { key: 'pet_id', value: '' },
    { key: 'batch_id', value: '' },
    { key: 'tag_public_id', value: '' },
    { key: 'tag_id', value: '' },
    { key: 'message_id', value: '' },
    { key: 'contact_id', value: '' },
    { key: 'plan_id', value: '' },
    { key: 'provider_payment_id', value: '' },
    { key: 'mp_webhook_secret', value: '' },
    { key: 'user_id', value: '' },
    { key: 'transfer_token', value: '' },
    { key: 'new_tag_id', value: '' },
    { key: 'first_code', value: '' },
  ],
  item: items,
}

fs.writeFileSync(OUT, JSON.stringify(collection, null, 2) + '\n', 'utf8')

const count = items.reduce((n, f) => n + f.item.length, 0)
console.log(`✅ Coleção gerada: ${OUT}`)
console.log(`   ${items.length} pastas | ${count} rotas`)
