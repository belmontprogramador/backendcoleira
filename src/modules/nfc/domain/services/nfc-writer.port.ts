/**
 * Porta do escritor de NFC (hardware).
 * Abstração sobre a estação USB. Implementação real fora do escopo do backend;
 * nos testes usamos mock.
 */
export interface NfcWriterPort {
  /** Grava a URL no chip físico. Retorna true se o comando aceitou. */
  write(uid: string, url: string): Promise<boolean>
}

export const NFC_WRITER_PORT = Symbol('NFC_WRITER_PORT')
