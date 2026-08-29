import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaUserAccessRepository } from '../prisma-user-access.repository'

describe('PrismaUserAccessRepository (integração)', () => {
  let prisma: PrismaService
  let repository: PrismaUserAccessRepository

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
    repository = new PrismaUserAccessRepository(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.nfcTag.deleteMany()
    await prisma.batch.deleteMany()
    await prisma.petPrivacy.deleteMany()
    await prisma.pet.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.user.deleteMany()

    // roles
    const admin = await prisma.role.create({ data: { name: 'ADMIN' } })
    const user = await prisma.role.create({ data: { name: 'USER' } })

    // permissions
    const readUser = await prisma.permission.create({
      data: { code: 'user:read', resource: 'users', action: 'read' },
    })
    const manageRole = await prisma.permission.create({
      data: { code: 'role:manage', resource: 'roles', action: 'manage' },
    })

    // role -> permissions
    await prisma.rolePermission.create({
      data: { role_id: admin.id, permission_id: readUser.id },
    })
    await prisma.rolePermission.create({
      data: { role_id: admin.id, permission_id: manageRole.id },
    })

    // user -> role
    const u = await prisma.user.create({
      data: {
        id: 'acc-user',
        name: 'Admin User',
        email: 'acc@email.com',
        password_hash: 'x',
      },
    })
    await prisma.userRole.create({
      data: { user_id: u.id, role_id: admin.id },
    })
  })

  it('resolve roles e permissões de um usuário', async () => {
    const access = await repository.resolveAccess('acc-user')

    expect(access).not.toBeNull()
    expect(access?.roles).toContain('ADMIN')
    expect(access?.permissions).toEqual(
      expect.arrayContaining(['user:read', 'role:manage']),
    )
  })

  it('retorna null para usuário inexistente', async () => {
    const access = await repository.resolveAccess('nao-existe')
    expect(access).toBeNull()
  })

  it('retorna roles vazias para usuário sem role', async () => {
    const u = await prisma.user.create({
      data: {
        id: 'sem-role',
        name: 'Sem Role',
        email: 'semrole@email.com',
        password_hash: 'x',
      },
    })

    const access = await repository.resolveAccess(u.id)
    expect(access?.roles).toEqual([])
    expect(access?.permissions).toEqual([])
  })

  it('retorna null para usuário bloqueado (revogação imediata)', async () => {
    const admin = await prisma.role.findUniqueOrThrow({
      where: { name: 'ADMIN' },
    })
    const u = await prisma.user.create({
      data: {
        id: 'bloqueado',
        name: 'Bloqueado',
        email: 'bloqueado@email.com',
        password_hash: 'x',
        status: 'BLOCKED',
      },
    })
    await prisma.userRole.create({
      data: { user_id: u.id, role_id: admin.id },
    })

    const access = await repository.resolveAccess(u.id)
    expect(access).toBeNull()
  })

  it('retorna null para usuário soft-deletado', async () => {
    const u = await prisma.user.create({
      data: {
        id: 'deletado',
        name: 'Deletado',
        email: 'deletado@email.com',
        password_hash: 'x',
        status: 'ACTIVE',
        deleted_at: new Date(),
      },
    })

    const access = await repository.resolveAccess(u.id)
    expect(access).toBeNull()
  })
})
