import { mkdir, rm, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { LocalPetStorageService } from '../local-pet-storage.service'

describe('LocalPetStorageService (integração)', () => {
  const baseDir = './uploads/pets'
  const testKey = 'test-pet/photo-test.jpg'

  let service: LocalPetStorageService

  beforeEach(() => {
    service = new LocalPetStorageService()
  })

  afterAll(async () => {
    await rm(join(process.cwd(), baseDir, 'test-pet'), {
      recursive: true,
      force: true,
    })
  })

  it('faz upload e retorna URL local', async () => {
    const url = await service.upload(
      testKey,
      Buffer.from('fake-image'),
      'image/jpeg',
    )
    expect(url).toBe(`/uploads/pets/${testKey}`)

    // confirma que o arquivo foi gravado
    await access(join(process.cwd(), baseDir, testKey))
  })

  it('remove arquivo de forma idempotente', async () => {
    await service.upload(testKey, Buffer.from('fake-image'), 'image/jpeg')
    await service.remove(testKey)

    // remover de novo não lança erro
    await expect(service.remove(testKey)).resolves.toBeUndefined()
  })
})
