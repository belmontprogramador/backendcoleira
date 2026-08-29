import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../../../infrastructure/database/prisma.service'
import { PrismaRoleRepository } from '../prisma-role.repository'

describe('PrismaRoleRepository (integração)', () => {
  let prisma: PrismaService
  let repository: PrismaRoleRepository

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
    repository = new PrismaRoleRepository(prisma)
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

    const admin = await prisma.role.create({ data: { name: 'ADMIN' } })
    const user = await prisma.role.create({ data: { name: 'USER' } })
    const operator = await prisma.role.create({ data: { name: 'OPERATOR' } })

    // permissões para testar a resolução em lote (união + dedup + ordenação).
    const userRead = await prisma.permission.create({
      data: { code: 'user:read', resource: 'users', action: 'read' },
    })
    const petRead = await prisma.permission.create({
      data: { code: 'pet:read', resource: 'pets', action: 'read' },
    })
    const tagRecord = await prisma.permission.create({
      data: { code: 'tag:record', resource: 'tags', action: 'record' },
    })
    await prisma.rolePermission.create({
      data: { role_id: admin.id, permission_id: userRead.id },
    })
    await prisma.rolePermission.create({
      data: { role_id: admin.id, permission_id: petRead.id },
    })
    await prisma.rolePermission.create({
      data: { role_id: operator.id, permission_id: tagRecord.id },
    })
    await prisma.rolePermission.create({
      data: { role_id: operator.id, permission_id: petRead.id },
    })

    const u1 = await prisma.user.create({
      data: { id: 'u1', name: 'A', email: 'a@email.com', password_hash: 'x' },
    })
    const u2 = await prisma.user.create({
      data: { id: 'u2', name: 'B', email: 'b@email.com', password_hash: 'x' },
    })
    await prisma.user.create({
      data: { id: 'u3', name: 'C', email: 'c@email.com', password_hash: 'x' },
    })

    // u1 tem múltiplas roles (agrupamento); u2 tem uma; u3 nenhuma.
    await prisma.userRole.create({
      data: { user_id: u1.id, role_id: admin.id },
    })
    await prisma.userRole.create({
      data: { user_id: u1.id, role_id: operator.id },
    })
    await prisma.userRole.create({ data: { user_id: u2.id, role_id: user.id } })
  })

  it('agrupa roles por usuário (ordenado) e preenche vazios', async () => {
    const map = await repository.findRolesByUserIds(['u1', 'u2', 'u3'])

    expect(map.get('u1')).toEqual(['ADMIN', 'OPERATOR'])
    expect(map.get('u2')).toEqual(['USER'])
    expect(map.get('u3')).toEqual([])
  })

  it('resolve permissões em lote (união, dedup, ordenado) e preenche vazios', async () => {
    const map = await repository.findPermissionsByUserIds(['u1', 'u2', 'u3'])

    // u1 = ADMIN (user:read, pet:read) + OPERATOR (tag:record, pet:read)
    //   → união deduplicada e ordenada alfabeticamente.
    expect(map.get('u1')).toEqual(['pet:read', 'tag:record', 'user:read'])
    expect(map.get('u2')).toEqual([])
    expect(map.get('u3')).toEqual([])
  })

  it('retorna mapa vazio para lista vazia (permissões)', async () => {
    const map = await repository.findPermissionsByUserIds([])

    expect(map.size).toBe(0)
  })

  it('ignora ids inexistentes e retorna vazio', async () => {
    const map = await repository.findRolesByUserIds(['nao-existe'])

    expect(map.get('nao-existe')).toEqual([])
  })

  it('retorna mapa vazio para lista vazia', async () => {
    const map = await repository.findRolesByUserIds([])

    expect(map.size).toBe(0)
  })
})
