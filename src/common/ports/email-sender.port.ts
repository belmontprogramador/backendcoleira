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
  /** Coordenadas GPS reportadas pelo navegador (null = não rastreada). */
  latitude: number | null
  longitude: number | null
}

export interface ScanAlertEmailData {
  petName: string
  source: AccessSource
  /** Coordenadas GPS reportadas pelo navegador (null = não rastreada). */
  latitude: number | null
  longitude: number | null
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
