/**
 * Informação de exibição do dono de um pet (dados do agregado User), resolvida
 * fora do agregado Pet para não violar a fronteira entre agregados.
 */
export interface PetOwnerInfo {
  id: string
  name: string
  email: string
}

/**
 * Porta para resolver os dados de exibição do dono (id/name/email) em lote.
 * Consumida apenas pela camada de aplicação (assembler de resposta admin).
 * Implementada na infraestrutura (consulta a tabela `users` via Prisma).
 */
export interface PetOwnerInfoPort {
  findByIds(ids: string[]): Promise<PetOwnerInfo[]>
}

export const PET_OWNER_INFO_PORT = Symbol('PET_OWNER_INFO_PORT')
