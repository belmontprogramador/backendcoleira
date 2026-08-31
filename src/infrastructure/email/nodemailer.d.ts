/**
 * Declaração mínima de tipos para o `nodemailer` (CommonJS).
 *
 * O pacote `nodemailer` (v9) não embute tipos e o `@types/nodemailer` não cobre
 * a v9 de forma confiável. Declaramos apenas a superfície usada pelo
 * `SmtpEmailSender` (createTransport + sendMail), mantendo o resto enxuto.
 */
declare module 'nodemailer' {
  export interface TransportOptions {
    host?: string
    port?: number
    secure?: boolean
    auth?: {
      user?: string
      pass?: string
    }
  }

  export interface MailOptions {
    from?: string
    to?: string
    subject?: string
    text?: string
    html?: string
  }

  export interface SentMessageInfo {
    messageId?: string
    accepted?: string[]
    rejected?: string[]
    response?: string
  }

  export interface Transporter {
    sendMail(mailOptions: MailOptions): Promise<SentMessageInfo>
  }

  export function createTransport(options: TransportOptions): Transporter
}
