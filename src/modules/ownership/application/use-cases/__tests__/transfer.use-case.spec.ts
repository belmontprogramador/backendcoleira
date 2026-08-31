import { RequestTransferUseCase } from '../request-transfer.use-case'
import { AcceptTransferUseCase } from '../accept-transfer.use-case'
import {
  TagNotFoundError,
  TagNotOwnedError,
  UserNotFoundError,
  TransferToSelfError,
  TransferTokenInvalidError,
  TransferUserMismatchError,
} from '../../errors'
import type { NfcTagRepositoryPort } from '../../../../nfc/domain/repositories/nfc-tag.repository.port'
import type { UserRepositoryPort } from '../../../../users/domain/repositories/user.repository.port'
import type { TemporaryTokenStorePort } from '../../../../../common/ports/temporary-token-store.port'
import type { EmailSenderPort } from '../../../../../common/ports/email-sender.port'
import type { AuditLoggerPort } from '../../../../../common/ports/audit-logger.port'
import type { PublicProfileInvalidationPort } from '../../../../../common/ports/public-profile-invalidation.port'
import { NfcTag } from '../../../../nfc/domain/entities/nfc-tag.entity'
import { PublicId } from '../../../../nfc/domain/value-objects/public-id.vo'
import { Uid } from '../../../../nfc/domain/value-objects/uid.vo'
import { User } from '../../../../users/domain/entities/user.entity'
import { Email } from '../../../../users/domain/value-objects/email.vo'

jest.mock('node:crypto', () => ({ randomUUID: () => 'transfer-token-123' }))

describe('Ownership — transferência', () => {
  let tags: jest.Mocked<NfcTagRepositoryPort>
  let users: jest.Mocked<UserRepositoryPort>
  let tokens: jest.Mocked<TemporaryTokenStorePort>
  let email: jest.Mocked<EmailSenderPort>
  let audit: jest.Mocked<AuditLoggerPort>
  let invalidation: jest.Mocked<PublicProfileInvalidationPort>

  beforeEach(() => {
    tags = {
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findByUid: jest.fn(),
      findNextToWrite: jest.fn(),
      listByBatch: jest.fn(),
      listByPet: jest.fn(),

      listUnactivated: jest.fn(),
      list: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
    }
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    }
    tokens = { save: jest.fn(), consume: jest.fn() }
    email = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendTransferEmail: jest.fn(),
    }
    audit = { log: jest.fn() }
    invalidation = {
      invalidateByPublicId: jest.fn(),
      invalidateByPetId: jest.fn(),
    }
  })

  function activeTag(
    ownerId = 'user-1',
    petId: string | null = 'pet-1',
  ): NfcTag {
    const tag = NfcTag.create({
      id: 'tag-1',
      publicId: PublicId.create('7F4K9M2Q'),
      activationCodeEncrypted: 'encrypted',
    })
    tag.markWritten(Uid.create('04:A7:32:91:8B:1F'))
    tag.markInStock()
    tag.markSold()
    tag.markDelivered()
    tag.activate(ownerId)
    if (petId) {
      tag.associatePet(petId)
    }
    return tag
  }

  function makeUser(id: string, emailAddr: string): User {
    return User.create({
      id,
      name: `User ${id}`,
      email: Email.create(emailAddr),
      passwordHash: 'x',
    })
  }

  describe('RequestTransferUseCase', () => {
    it('gera token e envia email ao destinatário', async () => {
      tags.findById.mockResolvedValue(activeTag())
      users.findByEmail.mockResolvedValue(makeUser('user-2', 'b@email.com'))
      const useCase = new RequestTransferUseCase(
        tags,
        users,
        tokens,
        email,
        audit,
      )

      const result = await useCase.execute('user-1', 'tag-1', 'b@email.com')

      expect(result.token).toBe('transfer-token-123')
      expect(tokens.save).toHaveBeenCalledWith(
        'transfer:transfer-token-123',
        expect.any(String),
        7 * 24 * 3600,
      )
      expect(email.sendTransferEmail).toHaveBeenCalledWith(
        'b@email.com',
        'transfer-token-123',
      )
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tag_transfer_requested' }),
      )
    })

    it('rejeita transferir para si mesmo', async () => {
      tags.findById.mockResolvedValue(activeTag())
      users.findByEmail.mockResolvedValue(makeUser('user-1', 'a@email.com'))
      const useCase = new RequestTransferUseCase(
        tags,
        users,
        tokens,
        email,
        audit,
      )

      await expect(
        useCase.execute('user-1', 'tag-1', 'a@email.com'),
      ).rejects.toThrow(TransferToSelfError)
    })

    it('rejeita destinatário inexistente', async () => {
      tags.findById.mockResolvedValue(activeTag())
      users.findByEmail.mockResolvedValue(null)
      const useCase = new RequestTransferUseCase(
        tags,
        users,
        tokens,
        email,
        audit,
      )

      await expect(
        useCase.execute('user-1', 'tag-1', 'x@email.com'),
      ).rejects.toThrow(UserNotFoundError)
    })

    it('rejeita tag de outro dono (IDOR)', async () => {
      tags.findById.mockResolvedValue(activeTag('user-2'))
      const useCase = new RequestTransferUseCase(
        tags,
        users,
        tokens,
        email,
        audit,
      )

      await expect(
        useCase.execute('user-1', 'tag-1', 'b@email.com'),
      ).rejects.toThrow(TagNotOwnedError)
    })
  })

  describe('AcceptTransferUseCase', () => {
    it('aceita transferência e muda o owner', async () => {
      tags.findById.mockResolvedValue(activeTag('user-1', 'pet-1'))
      users.findById.mockResolvedValue(makeUser('user-2', 'b@email.com'))
      tokens.consume.mockResolvedValue(
        JSON.stringify({ tagId: 'tag-1', toUserId: 'user-2' }),
      )
      const useCase = new AcceptTransferUseCase(
        tags,
        users,
        tokens,
        audit,
        invalidation,
      )

      const result = await useCase.execute('user-2', 'transfer-token-123')

      expect(result.ownerId).toBe('user-2')
      expect(result.petId).toBe('pet-1') // pet mantido
      expect(invalidation.invalidateByPublicId).toHaveBeenCalledWith('7F4K9M2Q')
      expect(tokens.consume).toHaveBeenCalledWith('transfer:transfer-token-123')
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tag_transfer' }),
      )
    })

    it('rejeita token inválido/expirado', async () => {
      tokens.consume.mockResolvedValue(null)
      const useCase = new AcceptTransferUseCase(
        tags,
        users,
        tokens,
        audit,
        invalidation,
      )

      await expect(
        useCase.execute('user-2', 'transfer-token-123'),
      ).rejects.toThrow(TransferTokenInvalidError)
    })

    it('rejeita destinatário diferente do token', async () => {
      tokens.consume.mockResolvedValue(
        JSON.stringify({ tagId: 'tag-1', toUserId: 'user-3' }),
      )
      const useCase = new AcceptTransferUseCase(
        tags,
        users,
        tokens,
        audit,
        invalidation,
      )

      await expect(
        useCase.execute('user-2', 'transfer-token-123'),
      ).rejects.toThrow(TransferUserMismatchError)
    })

    it('lança TagNotFoundError se tag sumiu', async () => {
      tokens.consume.mockResolvedValue(
        JSON.stringify({ tagId: 'tag-x', toUserId: 'user-2' }),
      )
      tags.findById.mockResolvedValue(null)
      const useCase = new AcceptTransferUseCase(
        tags,
        users,
        tokens,
        audit,
        invalidation,
      )

      await expect(
        useCase.execute('user-2', 'transfer-token-123'),
      ).rejects.toThrow(TagNotFoundError)
    })
  })
})
