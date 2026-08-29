import { Injectable } from '@nestjs/common'
import type { NfcWriterPort } from '../../domain/services/nfc-writer.port'
import { MockNfcChip } from './mock-nfc-chip'

/**
 * Mock do escritor de NFC (desenvolvimento/testes).
 * Simula a gravação em memória. Em produção, substituir pela implementação
 * que fala com o leitor USB — a porta `NfcWriterPort` permanece.
 */
@Injectable()
export class MockNfcWriter implements NfcWriterPort {
  constructor(private readonly chip: MockNfcChip) {}

  async write(uid: string, url: string): Promise<boolean> {
    this.chip.write(uid, url)
    return Promise.resolve(true)
  }
}
