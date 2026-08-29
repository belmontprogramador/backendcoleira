import { DomainError } from './domain-error'

/**
 * Erro transversal do Feature System (D6).
 * Lançado pelos use cases Premium como defesa em profundidade (além do
 * `FeatureGuard`), mapeado para HTTP 403 pelo `AuthExceptionFilter`.
 */
export class FeatureNotAvailableError extends DomainError {
  constructor(code: string) {
    super(`Funcionalidade não disponível no seu plano: ${code}`, 403)
  }
}
