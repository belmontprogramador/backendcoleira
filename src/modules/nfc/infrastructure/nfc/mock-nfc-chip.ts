import { Injectable } from '@nestjs/common'

/**
 * "Chip" NFC simulado (armazenamento em memória compartilhado).
 * Tanto o `MockNfcWriter` quanto o `MockNfcReader` usam este singleton para
 * simular o mesmo hardware físico.
 */
@Injectable()
export class MockNfcChip {
  private readonly store = new Map<string, string>()

  write(uid: string, url: string): void {
    this.store.set(uid.toUpperCase(), url)
  }

  read(uid: string): string | null {
    return this.store.get(uid.toUpperCase()) ?? null
  }
}
