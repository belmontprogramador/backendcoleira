import { CreateAffiliateUseCase } from '../create-affiliate.use-case'
import type { AffiliateRepositoryPort } from '../../../domain/repositories/affiliate.repository.port'
import type { UserRepositoryPort } from '../../../../users/domain/repositories/user.repository.port'
import type { PasswordHasherPort } from '../../../../../common/ports/password-hasher.port'
import type { PasswordGeneratorPort } from '../../../../../common/ports/password-generator.port'
import type { EmailSenderPort } from '../../../../../common/ports/email-sender.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import { Affiliate } from '../../../domain/entities/affiliate.entity'
import {
  AffiliateCodeAlreadyInUseError,
  AffiliateEmailAlreadyInUseError,
} from '../../errors'

describe('CreateAffiliateUseCase', () => {
  let affiliates: jest.Mocked<AffiliateRepositoryPort>
  let users: jest.Mocked<UserRepositoryPort>
  let hasher: jest.Mocked<PasswordHasherPort>
  let generator: jest.Mocked<PasswordGeneratorPort>
  let email: jest.Mocked<EmailSenderPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let useCase: CreateAffiliateUseCase

  beforeEach(() => {
    affiliates = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByCode: jest.fn(),
      findByEmail: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    hasher = { hash: jest.fn() } as unknown as jest.Mocked<PasswordHasherPort>
    generator = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<PasswordGeneratorPort>
    email = {
      sendAdminPasswordResetEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailSenderPort>
    audit = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditLoggerPort>

    useCase = new CreateAffiliateUseCase(
      affiliates,
      users,
      hasher,
      generator,
      email,
      audit,
    )
  })

  const dto = {
    code: 'ana123',
    name: 'Ana Souza',
    email: 'ana@example.com',
    pixKey: 'ana@pix.com',
    saleCommissionType: 'PERCENTAGE' as const,
    saleCommissionFixedCents: 0,
    saleCommissionPercentBps: 1000,
    subscriptionCommissionType: 'FIXED' as const,
    subscriptionCommissionFixedCents: 500,
    subscriptionCommissionPercentBps: 0,
    minWithdrawalCents: 2000,
  }

  it('cria User (senha temporária) + Affiliate', async () => {
    affiliates.findByCode.mockResolvedValue(null)
    affiliates.findByEmail.mockResolvedValue(null)
    users.findByEmail.mockResolvedValue(null)
    generator.generate.mockReturnValue('temp-pass')
    hasher.hash.mockResolvedValue('hashed')
    users.save.mockResolvedValue()
    affiliates.save.mockImplementation(async a => a)

    const result = await useCase.execute(dto)

    expect(result.code).toBe('ana123')
    expect(result.saleCommission.percentBps).toBe(1000)
    expect(result.subscriptionCommission.fixedCents).toBe(500)
    expect(result.minWithdrawalCents).toBe(2000)
    expect(users.save).toHaveBeenCalled()
    expect(email.sendAdminPasswordResetEmail).toHaveBeenCalledWith(
      'ana@example.com',
      'temp-pass',
    )
    expect(affiliates.save).toHaveBeenCalled()
  })

  it('reusa User existente e não envia senha temporária', async () => {
    affiliates.findByCode.mockResolvedValue(null)
    affiliates.findByEmail.mockResolvedValue(null)
    users.findByEmail.mockResolvedValue({
      id: 'user-1',
    } as never)
    affiliates.save.mockImplementation(async a => a)

    await useCase.execute(dto)

    expect(users.save).not.toHaveBeenCalled()
    expect(email.sendAdminPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('rejeita code duplicado', async () => {
    affiliates.findByCode.mockResolvedValue(
      Affiliate.create({
        id: 'aff-other',
        code: 'ana123',
        name: 'Outro',
        email: 'outro@example.com',
      }),
    )

    await expect(useCase.execute(dto)).rejects.toThrow(
      AffiliateCodeAlreadyInUseError,
    )
  })

  it('rejeita email duplicado', async () => {
    affiliates.findByCode.mockResolvedValue(null)
    affiliates.findByEmail.mockResolvedValue(
      Affiliate.create({
        id: 'aff-other',
        code: 'outro',
        name: 'Outro',
        email: 'ana@example.com',
      }),
    )

    await expect(useCase.execute(dto)).rejects.toThrow(
      AffiliateEmailAlreadyInUseError,
    )
  })
})
