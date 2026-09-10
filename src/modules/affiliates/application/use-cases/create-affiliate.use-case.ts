import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { AFFILIATE_REPOSITORY_PORT } from '../../domain/repositories/affiliate.repository.port'
import type { AffiliateRepositoryPort } from '../../domain/repositories/affiliate.repository.port'
import { USER_REPOSITORY_PORT } from '../../../users/domain/repositories/user.repository.port'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import { PASSWORD_HASHER_PORT } from '../../../../common/ports/password-hasher.port'
import type { PasswordHasherPort } from '../../../../common/ports/password-hasher.port'
import { PASSWORD_GENERATOR_PORT } from '../../../../common/ports/password-generator.port'
import type { PasswordGeneratorPort } from '../../../../common/ports/password-generator.port'
import { EMAIL_SENDER_PORT } from '../../../../common/ports/email-sender.port'
import type { EmailSenderPort } from '../../../../common/ports/email-sender.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { CommissionConfig } from '../../domain/value-objects/commission-config.vo'
import { Affiliate } from '../../domain/entities/affiliate.entity'
import { User } from '../../../users/domain/entities/user.entity'
import { Email } from '../../../users/domain/value-objects/email.vo'
import type { CreateAffiliateDto } from '../dtos/create-affiliate.schema'
import {
  AffiliateCodeAlreadyInUseError,
  AffiliateEmailAlreadyInUseError,
} from '../errors'

/**
 * Caso de uso: criar um afiliado (admin).
 *
 * Cria/associa um `User` (senha temporária + e-mail de boas-vindas) e então o
 * `Affiliate` com `code` (referral), config de comissão e piso de saque.
 */
@Injectable()
export class CreateAffiliateUseCase {
  constructor(
    @Inject(AFFILIATE_REPOSITORY_PORT)
    private readonly affiliates: AffiliateRepositoryPort,
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(PASSWORD_GENERATOR_PORT)
    private readonly generator: PasswordGeneratorPort,
    @Inject(EMAIL_SENDER_PORT) private readonly email: EmailSenderPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(input: CreateAffiliateDto): Promise<Affiliate> {
    if (await this.affiliates.findByCode(input.code)) {
      throw new AffiliateCodeAlreadyInUseError()
    }
    if (await this.affiliates.findByEmail(input.email)) {
      throw new AffiliateEmailAlreadyInUseError()
    }

    let userId: string | null = null
    const existingUser = await this.users.findByEmail(input.email)
    if (existingUser) {
      userId = existingUser.id
    } else {
      const tempPassword = this.generator.generate()
      const passwordHash = await this.hasher.hash(tempPassword)
      const user = User.create({
        id: randomUUID(),
        name: input.name,
        email: Email.create(input.email),
        passwordHash,
        phone: input.phone ?? null,
      })
      user.verifyEmail()
      await this.users.save(user)
      userId = user.id
      await this.email.sendAdminPasswordResetEmail(input.email, tempPassword)
    }

    const saleCommission = CommissionConfig.create({
      type: input.saleCommissionType,
      fixedCents: input.saleCommissionFixedCents,
      percentBps: input.saleCommissionPercentBps,
    })
    const subscriptionCommission = CommissionConfig.create({
      type: input.subscriptionCommissionType,
      fixedCents: input.subscriptionCommissionFixedCents,
      percentBps: input.subscriptionCommissionPercentBps,
    })

    const affiliate = Affiliate.create({
      id: randomUUID(),
      userId,
      code: input.code,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      document: input.document ?? null,
      pixKey: input.pixKey ?? null,
      bankName: input.bankName ?? null,
      bankAgency: input.bankAgency ?? null,
      bankAccount: input.bankAccount ?? null,
      saleCommission,
      subscriptionCommission,
      minWithdrawalCents: input.minWithdrawalCents,
    })

    const saved = await this.affiliates.save(affiliate)
    await this.audit.log({
      action: 'affiliate_created',
      entity: 'affiliate',
      entityId: saved.id,
      metadata: { code: saved.code, email: saved.email },
    })

    return saved
  }
}
