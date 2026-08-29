/**
 * Porta do leitor de NFC (hardware).
 * Lê o conteúdo gravado no chip para validação (write→read→compare).
 */
export interface NfcReaderPort {
  /** Lê a URL gravada no chip físico. Retorna null se vazio/ilegível. */
  read(uid: string): Promise<string | null>
}

export const NFC_READER_PORT = Symbol('NFC_READER_PORT')
