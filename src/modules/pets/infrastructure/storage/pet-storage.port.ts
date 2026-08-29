/**
 * Porta de armazenamento de fotos de pets.
 *
 * DIP: a aplicação depende desta abstração. A implementação (local em dev,
 * S3/R2 em produção) é plugável.
 */
export interface PetStoragePort {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>
  remove(key: string): Promise<void>
}

export const PET_STORAGE_PORT = Symbol('PET_STORAGE_PORT')
