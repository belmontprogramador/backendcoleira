import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { PrismaService } from './../src/infrastructure/database/prisma.service'
import { flushRedis } from './helpers/flush-redis'

type AuthBody = { accessToken: string; refreshToken: string }

describe('NFC produção (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await flushRedis(process.env.REDIS_URL ?? 'redis://localhost:6379')
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.user.deleteMany()
  })

  async function createOperator(): Promise<string> {
    const role = await prisma.role.create({ data: { name: 'OPERATOR' } })
    const permRecord = await prisma.permission.create({
      data: { code: 'tag:record', resource: 'tags', action: 'record' },
    })
    const permRead = await prisma.permission.create({
      data: { code: 'tag:read', resource: 'tags', action: 'read' },
    })
    const permBatch = await prisma.permission.create({
      data: { code: 'batch:manage', resource: 'batches', action: 'manage' },
    })
    const permWrite = await prisma.permission.create({
      data: { code: 'tag:write', resource: 'tags', action: 'write' },
    })
    await prisma.rolePermission.create({
      data: { role_id: role.id, permission_id: permRecord.id },
    })
    await prisma.rolePermission.create({
      data: { role_id: role.id, permission_id: permRead.id },
    })
    await prisma.rolePermission.create({
      data: { role_id: role.id, permission_id: permBatch.id },
    })
    await prisma.rolePermission.create({
      data: { role_id: role.id, permission_id: permWrite.id },
    })

    const user = await prisma.user.create({
      data: {
        id: 'operator-1',
        name: 'Operator',
        email: 'operator@email.com',
        password_hash: await bcrypt.hash('operatorSenha123', 12),
        status: 'ACTIVE',
      },
    })
    await prisma.userRole.create({
      data: { user_id: user.id, role_id: role.id },
    })

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'operator@email.com', password: 'operatorSenha123' })
      .expect(200)
    return (res.body as AuthBody).accessToken
  }

  async function createBatchWithTags(
    token: string,
    quantity: number,
  ): Promise<{ batchId: string; publicIds: string[] }> {
    const createRes = await request(app.getHttpServer())
      .post('/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Lote ${Date.now()}`, quantity })
      .expect(201)
    const batchId = (createRes.body as { id: string }).id

    await request(app.getHttpServer())
      .post(`/admin/batches/${batchId}/generate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)

    const listRes = await request(app.getHttpServer())
      .get(`/admin/tags?batchId=${batchId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const tags = (listRes.body as { data: Array<{ publicId: string }> }).data
    return { batchId, publicIds: tags.map(t => t.publicId) }
  }

  it('fluxo completo: criar lote → gerar tags → detalhar tag → gravar NFC', async () => {
    const token = await createOperator()

    // criar lote
    const createRes = await request(app.getHttpServer())
      .post('/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lote 001', quantity: 2 })
      .expect(201)
    const batchId = (createRes.body as { id: string }).id

    // gerar tags (retorna códigos uma vez)
    const genRes = await request(app.getHttpServer())
      .post(`/admin/batches/${batchId}/generate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    const gen = genRes.body as { count: number; codes: string[] }
    expect(gen.count).toBe(2)
    expect(gen.codes).toHaveLength(2)
    expect(gen.codes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)

    // listar tags (envelope { data, meta })
    const listRes = await request(app.getHttpServer())
      .get(`/admin/tags?batchId=${batchId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const tags = (
      listRes.body as {
        data: Array<{ publicId: string; status: string }>
      }
    ).data
    expect(tags).toHaveLength(2)
    expect((listRes.body as { meta: { total: number } }).meta.total).toBe(2)
    expect(tags[0].status).toBe('CREATED')
    // não vaza activation_code_encrypted
    const firstTag = tags[0]
    expect(firstTag).not.toHaveProperty('activation_code_encrypted')

    // detalhar tag
    const publicId = tags[0].publicId
    const detailRes = await request(app.getHttpServer())
      .get(`/admin/tags/${publicId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect((detailRes.body as { publicId: string }).publicId).toBe(publicId)

    // gravar NFC (write→read→compare via mock)
    const writeRes = await request(app.getHttpServer())
      .post('/admin/tags/write')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicId, uid: '04:A7:32:91:8B:1F' })
      .expect(201)
    expect((writeRes.body as { status: string }).status).toBe('READY')
    expect((writeRes.body as { uid: string }).uid).toBe('04:A7:32:91:8B:1F')

    // QR
    await request(app.getHttpServer())
      .post(`/admin/tags/${publicId}/qr`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', /image\/png/)
  })

  it('USUÁRIO sem tag:record não pode gravar NFC (403)', async () => {
    // usuário comum (sem roles/permissões de produção)
    const user = await prisma.user.create({
      data: {
        id: 'regular-1',
        name: 'Regular',
        email: 'regular@email.com',
        password_hash: await bcrypt.hash('regularSenha123', 12),
        status: 'ACTIVE',
      },
    })
    // cria role USER (sem permissões)
    const role = await prisma.role.create({ data: { name: 'USER' } })
    await prisma.userRole.create({
      data: { user_id: user.id, role_id: role.id },
    })

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'regular@email.com', password: 'regularSenha123' })
      .expect(200)
    const token = (res.body as AuthBody).accessToken

    await request(app.getHttpServer())
      .post('/admin/tags/write')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicId: 'ABCDEFGH', uid: '04:A7:32:91:8B:1F' })
      .expect(403)
  })

  it('GET /admin/tags sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/admin/tags').expect(401)
  })

  it('GET /admin/batches lista lotes (array puro)', async () => {
    const token = await createOperator()
    await createBatchWithTags(token, 1)

    const res = await request(app.getHttpServer())
      .get('/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    const batches = res.body as Array<{
      id: string
      name: string
      status: string
      quantity: number
      generatedCount: number
    }>
    expect(batches.length).toBeGreaterThanOrEqual(1)
    expect(batches[0]).toHaveProperty('quantity')
    expect(batches[0]).toHaveProperty('generatedCount')
    // não vaza created_by (dado administrativo interno)
    expect(batches[0]).not.toHaveProperty('created_by')
  })

  it('GET /admin/batches sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/admin/batches').expect(401)
  })

  it('fluxo celular: next-to-write → report → reset → reprint-code', async () => {
    const token = await createOperator()
    const { publicIds } = await createBatchWithTags(token, 2)

    // 1) next-to-write retorna a CREATED mais antiga + URL
    const nextRes = await request(app.getHttpServer())
      .get('/admin/tags/next-to-write')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const first = nextRes.body as { publicId: string; url: string }
    expect(publicIds).toContain(first.publicId)
    expect(first.url).toBe(`https://elopet.online/p/${first.publicId}`)

    // 2) report matched=true → READY
    const reportRes = await request(app.getHttpServer())
      .post('/admin/tags/report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        publicId: first.publicId,
        uid: '04:A7:32:91:8B:1F',
        matched: true,
      })
      .expect(201)
    expect((reportRes.body as { status: string }).status).toBe('READY')

    // 3) next-to-write agora retorna a OUTRA tag (FIFO)
    const secondRes = await request(app.getHttpServer())
      .get('/admin/tags/next-to-write')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const second = secondRes.body as { publicId: string; url: string }
    expect(second.publicId).not.toBe(first.publicId)
    expect(publicIds).toContain(second.publicId)

    // 4) reset → CREATED + uid null + resetAt marcado
    const resetRes = await request(app.getHttpServer())
      .post(`/admin/tags/${first.publicId}/reset`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((resetRes.body as { status: string }).status).toBe('CREATED')
    expect((resetRes.body as { uid: string | null }).uid).toBeNull()
    expect((resetRes.body as { resetAt: string | null }).resetAt).not.toBeNull()

    // 5) reprint-code → código descriptografado
    const reprintRes = await request(app.getHttpServer())
      .post(`/admin/tags/${first.publicId}/reprint-code`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((reprintRes.body as { publicId: string }).publicId).toBe(
      first.publicId,
    )
    expect((reprintRes.body as { code: string }).code).toMatch(
      /^[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    )
  })

  it('report aceita uid ausente (Web NFC sem serialNumber)', async () => {
    const token = await createOperator()
    const { publicIds } = await createBatchWithTags(token, 1)

    const res = await request(app.getHttpServer())
      .post('/admin/tags/report')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicId: publicIds[0], matched: true })
      .expect(201)

    expect((res.body as { status: string }).status).toBe('READY')
    expect((res.body as { uid: string | null }).uid).toBeNull()
  })

  it('lote avança GENERATED → WRITING na 1ª gravação e pode ser completado', async () => {
    const token = await createOperator()
    const { batchId, publicIds } = await createBatchWithTags(token, 1)

    // lote recém-gerado ainda está GENERATED
    const before = await prisma.batch.findUnique({ where: { id: batchId } })
    expect(before?.status).toBe('GENERATED')

    // primeira gravação → lote vira WRITING
    await request(app.getHttpServer())
      .post('/admin/tags/report')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicId: publicIds[0], matched: true })
      .expect(201)

    const after = await prisma.batch.findUnique({ where: { id: batchId } })
    expect(after?.status).toBe('WRITING')

    // completar agora funciona (WRITING → COMPLETED)
    const completeRes = await request(app.getHttpServer())
      .post(`/admin/batches/${batchId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((completeRes.body as { status: string }).status).toBe('COMPLETED')
  })

  it('mark-available: READY → AVAILABLE (atalho Opção A) + idempotente', async () => {
    const token = await createOperator()
    const { publicIds } = await createBatchWithTags(token, 1)

    // grava → READY
    await request(app.getHttpServer())
      .post('/admin/tags/report')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicId: publicIds[0], uid: '04:A7:32:91:8B:1F', matched: true })
      .expect(201)

    // mark-available → AVAILABLE
    const res = await request(app.getHttpServer())
      .post(`/admin/tags/${publicIds[0]}/mark-available`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((res.body as { status: string }).status).toBe('AVAILABLE')

    // idempotente: segunda chamada não quebra
    const res2 = await request(app.getHttpServer())
      .post(`/admin/tags/${publicIds[0]}/mark-available`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((res2.body as { status: string }).status).toBe('AVAILABLE')
  })

  it('mark-available retorna 404 para tag inexistente', async () => {
    const token = await createOperator()

    await request(app.getHttpServer())
      .post('/admin/tags/NAOEXISTE/mark-available')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })

  it('next-to-write prioriza tag resetada e expõe resetAt', async () => {
    const token = await createOperator()
    const { publicIds } = await createBatchWithTags(token, 3)

    // grava as 3 tags → todas READY (sem uid, evita duplicidade)
    for (const pid of publicIds) {
      await request(app.getHttpServer())
        .post('/admin/tags/report')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicId: pid, matched: true })
        .expect(201)
    }

    // reseta a terceira → CREATED + resetAt marcado
    const target = publicIds[2]
    const resetRes = await request(app.getHttpServer())
      .post(`/admin/tags/${target}/reset`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect((resetRes.body as { resetAt: string | null }).resetAt).not.toBeNull()

    // next-to-write devolve EXATAMENTE a tag resetada (reset-first)
    const nextRes = await request(app.getHttpServer())
      .get('/admin/tags/next-to-write')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const next = nextRes.body as { publicId: string; resetAt: string | null }
    expect(next.publicId).toBe(target)
    expect(next.resetAt).not.toBeNull()
  })

  it('next-to-write retorna corpo vazio quando não há tag CREATED', async () => {
    const token = await createOperator()
    const { publicIds } = await createBatchWithTags(token, 1)

    // grava a única tag → nenhuma CREATED restante
    await request(app.getHttpServer())
      .post('/admin/tags/report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        publicId: publicIds[0],
        uid: '04:A7:32:91:8B:1F',
        matched: true,
      })
      .expect(201)

    const res = await request(app.getHttpServer())
      .get('/admin/tags/next-to-write')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    const body = res.body as { publicId?: string } | null
    expect(body?.publicId ?? null).toBeNull()
  })

  it('report matched=false retorna 400 e incrementa failed_count', async () => {
    const token = await createOperator()
    const { batchId, publicIds } = await createBatchWithTags(token, 1)

    await request(app.getHttpServer())
      .post('/admin/tags/report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        publicId: publicIds[0],
        uid: '04:A7:32:91:8B:1F',
        matched: false,
      })
      .expect(400)

    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    expect(batch?.failed_count).toBe(1)
  })

  it('reprint-code exige tag:write (usuário comum → 403)', async () => {
    const token = await createOperator()
    const { publicIds } = await createBatchWithTags(token, 1)

    const user = await prisma.user.create({
      data: {
        id: 'regular-2',
        name: 'Regular2',
        email: 'regular2@email.com',
        password_hash: await bcrypt.hash('regularSenha123', 12),
        status: 'ACTIVE',
      },
    })
    const role = await prisma.role.create({ data: { name: 'USER' } })
    await prisma.userRole.create({
      data: { user_id: user.id, role_id: role.id },
    })
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'regular2@email.com', password: 'regularSenha123' })
      .expect(200)
    const userToken = (login.body as AuthBody).accessToken

    await request(app.getHttpServer())
      .post(`/admin/tags/${publicIds[0]}/reprint-code`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403)
  })

  it('GET /admin/batches/:id/sheet baixa o PDF (application/pdf)', async () => {
    const token = await createOperator()
    const { batchId } = await createBatchWithTags(token, 2)

    const res = await request(app.getHttpServer())
      .get(`/admin/batches/${batchId}/sheet`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.headers['content-type']).toContain('application/pdf')
    expect(res.headers['content-disposition']).toContain('attachment')

    const body = res.body as Buffer
    expect(body.subarray(0, 4).toString('ascii')).toBe('%PDF')
  })

  it('GET /admin/batches/:id/sheet exige tag:write (usuário comum → 403)', async () => {
    const token = await createOperator()
    const { batchId } = await createBatchWithTags(token, 1)

    const user = await prisma.user.create({
      data: {
        id: 'regular-sheet',
        name: 'RegularSheet',
        email: 'regular-sheet@email.com',
        password_hash: await bcrypt.hash('regularSenha123', 12),
        status: 'ACTIVE',
      },
    })
    const role = await prisma.role.create({ data: { name: 'USER' } })
    await prisma.userRole.create({
      data: { user_id: user.id, role_id: role.id },
    })
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'regular-sheet@email.com', password: 'regularSenha123' })
      .expect(200)
    const userToken = (login.body as AuthBody).accessToken

    await request(app.getHttpServer())
      .get(`/admin/batches/${batchId}/sheet`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403)
  })
})
