/**
 * Origem de um acesso/contato ao perfil público (doc-sistema §modelo-de-dados).
 *
 * - NFC: leitura do chip físico.
 * - QR: leitura do QR Code (mesma URL do NFC — RB10).
 * - DIRECT: link compartilhado ou digitação direta da URL.
 *
 * Compartilhado entre `access-events` e `contact` — por isso vive em `common`.
 */
export enum AccessSource {
  NFC = 'NFC',
  QR = 'QR',
  DIRECT = 'DIRECT',
}

/**
 * Converte o query param `?source=` (case-insensitive) para `AccessSource`.
 * Valor inválido/ausente → `DIRECT` (nunca quebra o fluxo do perfil).
 */
export function parseAccessSource(raw: string | undefined): AccessSource {
  switch (raw?.toLowerCase()) {
    case 'nfc':
      return AccessSource.NFC
    case 'qr':
      return AccessSource.QR
    default:
      return AccessSource.DIRECT
  }
}
