import type { PrismaService } from '../../src/infrastructure/database/prisma.service'

/**
 * Torna um usuário Premium (com a feature `CONTACT_MESSAGES`) para e2e.
 *
 * Usa `create` (não `upsert`): os e2e que dependem disso limpam
 * `subscription`/`plan_feature`/`plan`/`feature` no `beforeEach`.
 */
export async function makePremium(
  prisma: PrismaService,
  userId: string,
): Promise<void> {
  const feature = await prisma.feature.create({
    data: { code: 'CONTACT_MESSAGES', name: 'Mensagens de Contato' },
  })
  const plan = await prisma.plan.create({
    data: {
      code: 'PREMIUM',
      name: 'Premium',
      price_cents: 1990,
      is_default: false,
    },
  })
  await prisma.planFeature.create({
    data: { plan_id: plan.id, feature_id: feature.id },
  })
  const now = new Date()
  await prisma.subscription.create({
    data: {
      user_id: userId,
      plan_id: plan.id,
      provider: 'MERCADO_PAGO',
      status: 'ACTIVE',
      started_at: now,
      current_period_start: now,
      current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  })
}
