import { mkdir, rm, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { Injectable } from '@nestjs/common'
import type { PetStoragePort } from './pet-storage.port'

const BASE_DIR = './uploads/pets'

/**
 * Implementação de storage de fotos local.
 *
 * Grava em `./uploads/pets/{key}` e retorna o caminho relativo
 * `/uploads/pets/{key}` (salvo no Postgres via `photo_url`). O backend serve
 * os uploads em `/uploads/*` (static assets no `main.ts`); o front monta a
 * URL absoluta com a base do backend.
 */
@Injectable()
export class LocalPetStorageService implements PetStoragePort {
  async upload(
    key: string,
    buffer: Buffer,
    _contentType: string,
  ): Promise<string> {
    const dir = join(process.cwd(), BASE_DIR, key)
    // key inclui subdiretório (ex.: {petId}/{filename}); garante o diretório.
    const parent = join(process.cwd(), BASE_DIR, key.split('/')[0] ?? '')
    await mkdir(parent, { recursive: true })
    await writeFile(dir, buffer)
    return `/uploads/pets/${key}`
  }

  async remove(key: string): Promise<void> {
    const path = join(process.cwd(), BASE_DIR, key)
    try {
      await access(path)
      await rm(path, { force: true })
    } catch {
      // já não existe — remoção é idempotente
    }
  }
}
