import { Injectable } from '@nestjs/common'
import type { NfcReaderPort } from '../../domain/services/nfc-reader.port'
import { MockNfcChip } from './mock-nfc-chip'

/**
 * Mock do leitor de NFC (desenvolvimento/testes).
 * Lê do mesmo "chip" simulado do `MockNfcWriter`.
 */
@Injectable()
export class MockNfcReader implements NfcReaderPort {
  constructor(private readonly chip: MockNfcChip) {}

  async read(uid: string): Promise<string | null> {
    return Promise.resolve(this.chip.read(uid))
  }
}
