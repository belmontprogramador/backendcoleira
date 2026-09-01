import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import type {
  ContactMessageEmailData,
  EmailSenderPort,
} from '../../common/ports/email-sender.port'

/**
 * Implementação de e-mail via SMTP (nodemailer) — produção.
 *
 * Selecionada pelo `EmailModule` quando `SMTP_HOST` está definido; sem essa
 * variável, o `LogEmailSender` (desenvolvimento) permanece ativo. O
 * transporter é criado de forma lazy (a conexão só abre no primeiro envio).
 */
@Injectable()
export class SmtpEmailSender implements EmailSenderPort {
  private readonly logger = new Logger(SmtpEmailSender.name)
  private transporter: Transporter | null = null

  constructor(private readonly config: ConfigService) {}

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001'
  }

  private get from(): string {
    return this.config.get<string>('SMTP_FROM') ?? 'no-reply@elopet.online'
  }

  private getTransport(): Transporter {
    if (this.transporter) {
      return this.transporter
    }
    const port = Number(this.config.get<number>('SMTP_PORT') ?? 587)
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    })
    return this.transporter
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    try {
      await this.getTransport().sendMail({
        from: this.from,
        to,
        subject,
        html,
        text,
      })
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail para ${to}: ${(error as Error).message}`,
      )
      throw error
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verificar-email?token=${token}`
    const subject = 'Verifique seu e-mail — Elopet'
    const text =
      'Olá!\n\n' +
      'Para confirmar seu e-mail na Elopet, acesse o link abaixo:\n\n' +
      `${link}\n\n` +
      'Ou insira o código manualmente na página de verificação:\n' +
      `${token}\n\n` +
      'Este link expira em 24 horas.'
    const html =
      '<p>Olá!</p>' +
      '<p>Para confirmar seu e-mail na Elopet, clique no botão abaixo:</p>' +
      `<p><a href="${link}">Confirmar e-mail</a></p>` +
      '<p>Ou insira o código manualmente na página de verificação:</p>' +
      `<p><code>${token}</code></p>` +
      '<p>Este link expira em 24 horas.</p>'
    await this.send(to, subject, html, text)
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/resetar-senha?token=${token}`
    const subject = 'Redefinição de senha — Elopet'
    const text =
      'Olá!\n\n' +
      'Recebemos um pedido para redefinir sua senha.\n\n' +
      'Acesse o link abaixo para criar uma nova senha:\n\n' +
      `${link}\n\n` +
      'Se não foi você, ignore este e-mail.'
    const html =
      '<p>Olá!</p>' +
      '<p>Recebemos um pedido para redefinir sua senha.</p>' +
      `<p><a href="${link}">Redefinir senha</a></p>` +
      '<p>Se não foi você, ignore este e-mail.</p>'
    await this.send(to, subject, html, text)
  }

  async sendAdminPasswordResetEmail(
    to: string,
    newPassword: string,
  ): Promise<void> {
    const subject = 'Sua senha foi redefinida — Elopet'
    const text =
      'Olá!\n\n' +
      'Sua senha foi redefinida por um administrador.\n\n' +
      `Nova senha: ${newPassword}\n\n` +
      'Recomendamos trocá-la após o primeiro acesso.'
    const html =
      '<p>Olá!</p>' +
      '<p>Sua senha foi redefinida por um administrador.</p>' +
      `<p>Nova senha: <code>${newPassword}</code></p>` +
      '<p>Recomendamos trocá-la após o primeiro acesso.</p>'
    await this.send(to, subject, html, text)
  }

  async sendTransferEmail(to: string, token: string): Promise<void> {
    const subject = 'Transferência de pingente — Elopet'
    const text =
      'Olá!\n\n' +
      'Você recebeu um pedido de transferência de pingente.\n\n' +
      `Código de transferência: ${token}`
    const html =
      '<p>Olá!</p>' +
      '<p>Você recebeu um pedido de transferência de pingente.</p>' +
      `<p>Código de transferência: <code>${token}</code></p>`
    await this.send(to, subject, html, text)
  }

  async sendContactMessageEmail(
    to: string,
    data: ContactMessageEmailData,
  ): Promise<void> {
    const subject = `Nova mensagem sobre ${data.petName} — Elopet`
    const text =
      `Nova mensagem de contato sobre ${data.petName}.\n\n` +
      `De: ${data.senderName ?? 'Anônimo'}\n` +
      `Telefone: ${data.senderPhone ?? '—'}\n` +
      `E-mail: ${data.senderEmail ?? '—'}\n` +
      `Localização aproximada: ${data.location ?? '—'}\n\n` +
      `Mensagem:\n${data.message}`
    const html =
      `<h1>Nova mensagem sobre ${data.petName}</h1>` +
      `<p><strong>De:</strong> ${data.senderName ?? 'Anônimo'}</p>` +
      `<p><strong>Telefone:</strong> ${data.senderPhone ?? '—'}</p>` +
      `<p><strong>E-mail:</strong> ${data.senderEmail ?? '—'}</p>` +
      `<p><strong>Localização aproximada:</strong> ${data.location ?? '—'}</p>` +
      `<p>${data.message}</p>`
    await this.send(to, subject, html, text)
  }
}
