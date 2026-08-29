import type { PrismaService } from '../../src/infrastructure/database/prisma.service'

/**
 * Limpa todas as tabelas na ordem correta (dependentes antes das pais) para
 * isolar os testes e2e que compartilham o mesmo banco Postgres.
 *
 * Necessário porque `Pet.owner` e `Batch.creator` são `onDelete: Restrict` —
 * `user.deleteMany()` falha (P2003) se houver pets/batches de suítes anteriores.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.paymentTransaction.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.planFeature.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.feature.deleteMany()
  await prisma.webhookEvent.deleteMany()
  await prisma.petContact.deleteMany()
  await prisma.petMedical.deleteMany()
  await prisma.accessEvent.deleteMany()
  await prisma.contactMessage.deleteMany()
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
}
