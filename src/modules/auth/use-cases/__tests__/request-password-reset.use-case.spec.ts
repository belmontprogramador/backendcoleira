import { RequestPasswordResetUseCase } from '../request-password-reset.use-case'
import type { UserRepositoryPort } from '../../../users/domain/repositories/user.repository.port'
import type { TemporaryTokenStorePort } from '../../../../common/ports/temporary-token-store.port'
import type { EmailSenderPort } from '../../../../common/ports/email-sender.port'

describe('RequestPasswordResetUseCase', () => {
  let users: jest.Mocked<UserRepositoryPort>
  let tokens: jest.Mocked<TemporaryTokenStorePort>
  let email: jest.Mocked<EmailSenderPort>
  let useCase: RequestPasswordResetUseCase

  beforeEach(() => {
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
    }
    useCase = new RequestPasswordResetUseCase(users, tokens, email)
  })

  it('envia email de reset se o usuário existe (não vaza existência)', async () => {
    users.findByEmail.mockResolvedValue({ id: 'u1' } as never)

    await useCase.execute('joao@email.com')

    expect(tokens.save).toHaveBeenCalledWith(expect.any(String), 'u1', 3600)
    expect(email.sendPasswordResetEmail).toHaveBeenCalled()
  })

  it('não envia email se o usuário não existe (sem vazar)', async () => {
    users.findByEmail.mockResolvedValue(null)

    await useCase.execute('nao-existe@email.com')

    expect(tokens.save).not.toHaveBeenCalled()
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled()
  })
})
