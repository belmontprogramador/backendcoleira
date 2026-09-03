/**
 * Porta de envio de e-mail transacional.
 * DIP: implementação concreta (SMTP, SES, etc.) vive na infraestrutura.
 */
import type { AccessSource } from '../constants/access-source'

export interface ContactMessageEmailData {
  petName: string
  senderName: string | null
  senderPhone: string | null
  senderEmail: string | null
  message: string
  /** Localização aproximada de quem enviou (IP→geo, pode ser null). */
  location: string | null
}

export interface ScanAlertEmailData {
  petName: string
  source: AccessSource
  /** Localização aproximada de quem acessou (IP→geo, pode ser null). */
  location: string | null
}

export interface EmailSenderPort {
  sendVerificationEmail(to: string, token: string): Promise<void>
  sendPasswordResetEmail(to: string, token: string): Promise<void>
  /** Envia a nova senha gerada por um admin (force reset). */
  sendAdminPasswordResetEmail(to: string, newPassword: string): Promise<void>
  sendTransferEmail(to: string, token: string): Promise<void>
  sendContactMessageEmail(
    to: string,
    data: ContactMessageEmailData,
  ): Promise<void>
  /** Alerta de acesso ao perfil de um pet perdido (doc-sistema §11). */
  sendScanAlertEmail(to: string, data: ScanAlertEmailData): Promise<void>
}

export const EMAIL_SENDER_PORT = Symbol('EMAIL_SENDER_PORT')
