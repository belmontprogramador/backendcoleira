/**
 * Porta do Feature System (transversal).
 * Resolve se um usuário possui uma funcionalidade gateada por plano.
 *
 * Fica em `common/ports` para que guards/use cases de qualquer módulo possam
 * consumi-la sem depender de um módulo específico (DIP).
 */
export interface FeatureAccessPort {
  hasFeature(userId: string, code: string): Promise<boolean>
  listFeatures(userId: string): Promise<string[]>
}

export const FEATURE_ACCESS_PORT = Symbol('FEATURE_ACCESS_PORT')
