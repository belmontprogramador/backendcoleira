/**
 * Porta da base URL pública do perfil — monta a URL `/p/:publicId` gravada
 * no chip NFC e usada no QR Code.
 *
 * Isola a camada de aplicação de `process.env`/`ConfigService` (DIP).
 */
export interface PublicBaseUrlPort {
  buildProfileUrl(publicId: string): string
}

export const PUBLIC_BASE_URL_PORT = Symbol('PUBLIC_BASE_URL_PORT')
