export const PET_SEX_VALUES = ['MALE', 'FEMALE', 'UNKNOWN'] as const

export type PetSex = (typeof PET_SEX_VALUES)[number]

/**
 * Tipo do sexo do pet (espelha o enum `PetSex` do Prisma, sem depender dele).
 */
export function isPetSex(value: string): value is PetSex {
  return (PET_SEX_VALUES as readonly string[]).includes(value)
}
