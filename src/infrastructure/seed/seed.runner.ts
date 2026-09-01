import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../database/prisma.service'
import type { PasswordHasherPort } from '../../common/ports/password-hasher.port'
import { CONTACT_MESSAGES_FEATURE } from '../../common/constants/features'

interface PermissionDef {
  code: string
  resource: string
  action: string
}

/** Matriz de permissões por role (doc-sistema §2.2 do plano-usuarios). */
const PERMISSIONS: PermissionDef[] = [
  { code: 'user:read', resource: 'users', action: 'read' },
  { code: 'user:write', resource: 'users', action: 'write' },
  { code: 'user:status', resource: 'users', action: 'status' },
  { code: 'user:role', resource: 'users', action: 'role' },
  { code: 'role:manage', resource: 'roles', action: 'manage' },
  { code: 'permission:manage', resource: 'permissions', action: 'manage' },
  { code: 'pet:read', resource: 'pets', action: 'read' },
  { code: 'pet:write', resource: 'pets', action: 'write' },
  { code: 'pet:delete', resource: 'pets', action: 'delete' },
  { code: 'tag:read', resource: 'tags', action: 'read' },
  { code: 'tag:write', resource: 'tags', action: 'write' },
  { code: 'tag:record', resource: 'tags', action: 'record' },
  { code: 'tag:transfer', resource: 'tags', action: 'transfer' },
  { code: 'batch:manage', resource: 'batches', action: 'manage' },
  { code: 'inventory:manage', resource: 'inventory', action: 'manage' },
  { code: 'order:manage', resource: 'orders', action: 'manage' },
  { code: 'subscription:read', resource: 'subscriptions', action: 'read' },
  { code: 'subscription:manage', resource: 'subscriptions', action: 'manage' },
  { code: 'audit:read', resource: 'audit', action: 'read' },
  { code: 'support:read', resource: 'support', action: 'read' },
]

const ROLES = ['USER', 'SUPPORT', 'OPERATOR', 'ADMIN', 'SUPER_ADMIN']

/** Features Premium (Fase 7) — somente as implementadas nesta fase. */
const FEATURES = [
  {
    code: 'PET_MEDICAL',
    name: 'Informações Médicas',
    description: 'Alergias, medicamentos, cuidados especiais e veterinário',
  },
  {
    code: 'MULTIPLE_CONTACTS',
    name: 'Múltiplos Contatos',
    description: 'Vários contatos de emergência por pet',
  },
  {
    code: 'ACCESS_HISTORY',
    name: 'Histórico de Acessos',
    description: 'Histórico de visualizações do perfil público',
  },
  {
    code: CONTACT_MESSAGES_FEATURE,
    name: 'Mensagens de Contato',
    description:
      'Recebe mensagens de quem encontrar o pet, com localização aproximada',
  },
]

/**
 * Planos (Fase 7). Preço em centavos. Ajuste o preço do Premium aqui.
 * Basic = gratuito (default). Premium = pago.
 */
const PLANS = [
  {
    code: 'BASIC',
    name: 'Basic',
    description: 'NFC/QR, perfil público e contato',
    price_cents: 0,
    is_default: true,
    features: [] as string[],
  },
  {
    code: 'PREMIUM',
    name: 'Premium',
    description: 'Dados médicos, múltiplos contatos e histórico de acessos',
    price_cents: 1990, // R$ 19,90/mês
    is_default: false,
    features: [
      'PET_MEDICAL',
      'MULTIPLE_CONTACTS',
      'ACCESS_HISTORY',
      CONTACT_MESSAGES_FEATURE,
    ],
  },
]

/** Mapeia role → permissões (conforme matriz §2.2). */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'user:read',
    'user:write',
    'user:status',
    'pet:read',
    'pet:write',
    'pet:delete',
    'tag:read',
    'tag:write',
    'tag:transfer',
    'batch:manage',
    'inventory:manage',
    'order:manage',
    'subscription:read',
    'subscription:manage',
    'audit:read',
  ],
  OPERATOR: [
    'pet:read',
    'tag:read',
    'tag:write',
    'tag:record',
    'tag:transfer',
    'batch:manage',
    'inventory:manage',
    'order:manage',
    'audit:read',
  ],
  SUPPORT: ['user:read', 'pet:read', 'tag:read', 'support:read'],
  // USER acessa via ownership (não via código de permissão).
  USER: [],
  // SUPER_ADMIN tem bypass total no guard; permissões explícitas aqui só
  // documentam a exclusividade (user:role, role:manage, permission:manage).
  SUPER_ADMIN: ['user:role', 'role:manage', 'permission:manage'],
}

/** Usuário de demonstração (cliente) — role USER, email verificado. */
const SYSTEM_USER_EMAIL = 'sistema@coleira.com'

interface DemoPet {
  id: string
  name: string
  species: string
  breed: string | null
  sex: 'MALE' | 'FEMALE' | 'UNKNOWN'
  birthDate: Date | null
  photoUrl: string | null
  description: string | null
  city: string | null
}

/** Pets de demonstração do usuário sistema (ids estáveis → seed idempotente). */
const DEMO_PETS: DemoPet[] = [
  {
    id: 'demo-pet-thor',
    name: 'Thor',
    species: 'Cachorro',
    breed: 'Golden Retriever',
    sex: 'MALE',
    birthDate: new Date('2021-03-15T00:00:00.000Z'),
    photoUrl: null,
    description: 'Cão dócil e energético, adora brincar de buscar.',
    city: 'São Paulo',
  },
  {
    id: 'demo-pet-luna',
    name: 'Luna',
    species: 'Gato',
    breed: 'Siamês',
    sex: 'FEMALE',
    birthDate: new Date('2022-07-01T00:00:00.000Z'),
    photoUrl: null,
    description: 'Gata curiosa e carinhosa, vive no colo.',
    city: 'São Paulo',
  },
]

/** Assinatura Premium de demonstração (id estável → seed idempotente). */
const DEMO_SUBSCRIPTION_ID = 'demo-sub-premium'

/**
 * Popula o banco com os dados iniciais (roles, permissões e admins padrão).
 * Idempotente: pode rodar múltiplas vezes sem duplicar.
 */
@Injectable()
export class SeedRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasherPort,
    private readonly config: ConfigService,
  ) {}

  async run(): Promise<void> {
    // 1. Roles
    for (const name of ROLES) {
      await this.prisma.role.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    }

    // 2. Permissões
    for (const p of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { code: p.code },
        create: p,
        update: { resource: p.resource, action: p.action },
      })
    }

    // 3. Associação role → permissões
    for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await this.prisma.role.findUniqueOrThrow({
        where: { name: roleName },
      })
      for (const code of permCodes) {
        const permission = await this.prisma.permission.findUniqueOrThrow({
          where: { code },
        })
        await this.prisma.rolePermission.upsert({
          where: {
            role_id_permission_id: {
              role_id: role.id,
              permission_id: permission.id,
            },
          },
          create: { role_id: role.id, permission_id: permission.id },
          update: {},
        })
      }
    }

    // 4. Usuários padrão — senhas vêm do ambiente (nunca default em código).
    await this.upsertAdmin(
      'superadmin@coleira.com',
      this.config.getOrThrow<string>('SUPER_ADMIN_PASSWORD'),
      'SUPER_ADMIN',
    )
    await this.upsertAdmin(
      'admin@coleira.com',
      this.config.getOrThrow<string>('ADMIN_PASSWORD'),
      'ADMIN',
    )

    // 5. Planos e Features (Fase 7)
    await this.seedPlans()

    // 6. Usuário de demonstração (cliente) + 2 pets + assinatura Premium.
    await this.seedSystemUser()
  }

  /** Popula features e planos (idempotente). */
  private async seedPlans(): Promise<void> {
    for (const f of FEATURES) {
      await this.prisma.feature.upsert({
        where: { code: f.code },
        create: f,
        update: { name: f.name, description: f.description },
      })
    }

    for (const p of PLANS) {
      const plan = await this.prisma.plan.upsert({
        where: { code: p.code },
        create: {
          code: p.code,
          name: p.name,
          description: p.description,
          price_cents: p.price_cents,
          is_default: p.is_default,
        },
        update: {
          name: p.name,
          description: p.description,
          price_cents: p.price_cents,
          is_default: p.is_default,
        },
      })

      for (const featureCode of p.features) {
        const feature = await this.prisma.feature.findUniqueOrThrow({
          where: { code: featureCode },
        })
        await this.prisma.planFeature.upsert({
          where: {
            plan_id_feature_id: { plan_id: plan.id, feature_id: feature.id },
          },
          create: { plan_id: plan.id, feature_id: feature.id },
          update: {},
        })
      }
    }
  }

  private async upsertAdmin(
    email: string,
    password: string,
    roleName: string,
  ): Promise<void> {
    const passwordHash = await this.hasher.hash(password)

    const user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: roleName === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin',
        password_hash: passwordHash,
        status: 'ACTIVE',
        email_verified_at: new Date(),
      },
      update: {},
    })

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: roleName },
    })
    await this.prisma.userRole.upsert({
      where: {
        user_id_role_id: { user_id: user.id, role_id: role.id },
      },
      create: { user_id: user.id, role_id: role.id },
      update: {},
    })
  }

  /**
   * Usuário de demonstração (cliente) com 2 pets e assinatura Premium.
   * Facilita testar a tela de "detalhe do cliente" (usuário + pets).
   */
  private async seedSystemUser(): Promise<void> {
    const passwordHash = await this.hasher.hash(
      this.config.getOrThrow<string>('SYSTEM_USER_PASSWORD'),
    )

    const user = await this.prisma.user.upsert({
      where: { email: SYSTEM_USER_EMAIL },
      create: {
        email: SYSTEM_USER_EMAIL,
        name: 'Usuário Sistema',
        password_hash: passwordHash,
        status: 'ACTIVE',
        email_verified_at: new Date(),
      },
      update: {},
    })

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: 'USER' },
    })
    await this.prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
      create: { user_id: user.id, role_id: role.id },
      update: {},
    })

    for (const pet of DEMO_PETS) {
      await this.upsertDemoPet(user.id, pet)
    }

    const premium = await this.prisma.plan.findUniqueOrThrow({
      where: { code: 'PREMIUM' },
    })
    const now = new Date()
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    await this.prisma.subscription.upsert({
      where: { id: DEMO_SUBSCRIPTION_ID },
      create: {
        id: DEMO_SUBSCRIPTION_ID,
        user_id: user.id,
        plan_id: premium.id,
        provider: 'MERCADO_PAGO',
        status: 'ACTIVE',
        started_at: now,
        current_period_start: now,
        current_period_end: periodEnd,
      },
      update: {},
    })
  }

  private async upsertDemoPet(ownerId: string, pet: DemoPet): Promise<void> {
    await this.prisma.pet.upsert({
      where: { id: pet.id },
      create: {
        id: pet.id,
        owner_id: ownerId,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        sex: pet.sex,
        birth_date: pet.birthDate,
        photo_url: pet.photoUrl,
        description: pet.description,
        city: pet.city,
        lost_status: false,
      },
      update: {
        owner_id: ownerId,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        sex: pet.sex,
        birth_date: pet.birthDate,
        photo_url: pet.photoUrl,
        description: pet.description,
        city: pet.city,
      },
    })

    await this.prisma.petPrivacy.upsert({
      where: { pet_id: pet.id },
      create: {
        pet_id: pet.id,
        show_phone: true,
        show_city: true,
      },
      update: {},
    })
  }
}
