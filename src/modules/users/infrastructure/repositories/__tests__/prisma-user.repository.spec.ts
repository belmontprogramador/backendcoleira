import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { User } from '../../../domain/entities/user.entity'
import { Email } from '../../../domain/value-objects/email.vo'
import { PrismaUserRepository } from '../prisma-user.repository'

describe('PrismaUserRepository (integração)', () => {
  let prisma: PrismaService
  let repository: PrismaUserRepository

  const config = {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      }
      return map[key]
    },
  } as unknown as ConfigService

  beforeAll(() => {
    prisma = new PrismaService(config)
    repository = new PrismaUserRepository(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.user.deleteMany()
  })

  it('salva um usuário e o recupera por id', async () => {
    const user = User.create({
      id: 'user-1',
      name: 'João Silva',
      email: Email.create('joao@email.com'),
      passwordHash: 'hashed',
      phone: '+5521999999999',
    })

    await repository.save(user)

    const found = await repository.findById('user-1')
    expect(found).not.toBeNull()
    expect(found?.id).toBe('user-1')
    expect(found?.name).toBe('João Silva')
    expect(found?.email.value).toBe('joao@email.com')
    expect(found?.phone).toBe('+5521999999999')
    expect(found?.status).toBe('PENDING_VERIFICATION')
  })

  it('recupera usuário por email', async () => {
    const user = User.create({
      id: 'user-2',
      name: 'Maria',
      email: Email.create('maria@email.com'),
      passwordHash: 'hashed',
    })

    await repository.save(user)

    const found = await repository.findByEmail('maria@email.com')
    expect(found?.id).toBe('user-2')
  })

  it('retorna null para id inexistente', async () => {
    const found = await repository.findById('nao-existe')
    expect(found).toBeNull()
  })

  it('persiste atualização de um usuário existente (upsert)', async () => {
    const user = User.create({
      id: 'user-3',
      name: 'Antes',
      email: Email.create('antes@email.com'),
      passwordHash: 'hashed',
    })
    await repository.save(user)

    user.updateProfile({ name: 'Depois', phone: '+5511999998888' })
    user.verifyEmail()
    await repository.save(user)

    const found = await repository.findById('user-3')
    expect(found?.name).toBe('Depois')
    expect(found?.phone).toBe('+5511999998888')
    expect(found?.status).toBe('ACTIVE')
    expect(found?.emailVerifiedAt).not.toBeNull()
  })

  it('persiste soft delete', async () => {
    const user = User.create({
      id: 'user-4',
      name: 'Soft',
      email: Email.create('soft@email.com'),
      passwordHash: 'hashed',
    })
    await repository.save(user)

    user.deactivate()
    await repository.save(user)

    const found = await repository.findById('user-4')
    expect(found?.deletedAt).not.toBeNull()
    expect(found?.status).toBe('INACTIVE')
  })

  it('conta usuários com e sem filtro de status', async () => {
    await prisma.user.createMany({
      data: [
        {
          id: 'count-1',
          name: 'Ativo',
          email: 'ativo@email.com',
          password_hash: 'hashed',
          status: 'ACTIVE',
        },
        {
          id: 'count-2',
          name: 'Bloqueado',
          email: 'bloqueado@email.com',
          password_hash: 'hashed',
          status: 'BLOCKED',
        },
      ],
    })

    await expect(repository.count({ page: 1, limit: 20 })).resolves.toBe(2)
    await expect(
      repository.count({ page: 1, limit: 20, status: 'BLOCKED' }),
    ).resolves.toBe(1)
    await expect(
      repository.count({ page: 1, limit: 20, status: 'ACTIVE' }),
    ).resolves.toBe(1)
  })

  it('lista com paginação (skip/take) e ordenação desc por criação', async () => {
    await prisma.user.createMany({
      data: [
        {
          id: 'list-1',
          name: 'A',
          email: 'list-1@email.com',
          password_hash: 'hashed',
          created_at: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'list-2',
          name: 'B',
          email: 'list-2@email.com',
          password_hash: 'hashed',
          created_at: new Date('2026-01-02T00:00:00Z'),
        },
        {
          id: 'list-3',
          name: 'C',
          email: 'list-3@email.com',
          password_hash: 'hashed',
          created_at: new Date('2026-01-03T00:00:00Z'),
        },
      ],
    })

    const page = await repository.list({ page: 1, limit: 2 })
    expect(page.map(u => u.id)).toEqual(['list-3', 'list-2'])
  })

  it('filtra por role (nomeada + NONE)', async () => {
    const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } })
    const operatorRole = await prisma.role.create({
      data: { name: 'OPERATOR' },
    })
    const userRole = await prisma.role.create({ data: { name: 'USER' } })

    const mk = (id: string, email: string) =>
      prisma.user.create({
        data: {
          id,
          name: id,
          email,
          password_hash: 'hashed',
          status: 'ACTIVE',
        },
      })

    const admin = await mk('role-admin', 'role-admin@email.com')
    const operator = await mk('role-operator', 'role-operator@email.com')
    const client = await mk('role-client', 'role-client@email.com')
    const noRole = await mk('role-none', 'role-none@email.com')

    await prisma.userRole.create({
      data: { user_id: admin.id, role_id: adminRole.id },
    })
    await prisma.userRole.create({
      data: { user_id: operator.id, role_id: operatorRole.id },
    })
    await prisma.userRole.create({
      data: { user_id: client.id, role_id: userRole.id },
    })

    // staff = OPERATOR + ADMIN (semântica OR)
    const staff = await repository.list({
      page: 1,
      limit: 20,
      role: ['OPERATOR', 'ADMIN'],
    })
    expect(staff.map(u => u.id).sort()).toEqual(['role-admin', 'role-operator'])

    // NONE = usuários sem role
    await expect(
      repository.count({ page: 1, limit: 20, role: ['NONE'] }),
    ).resolves.toBe(1)

    // clientes = USER + sem role
    await expect(
      repository.count({ page: 1, limit: 20, role: ['USER', 'NONE'] }),
    ).resolves.toBe(2)
  })
})
