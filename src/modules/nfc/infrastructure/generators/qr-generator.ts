import { Injectable } from '@nestjs/common'
import * as QRCode from 'qrcode'
import type {
  QrGeneratorOptions,
  QrGeneratorPort,
} from '../../domain/services/qr-generator.port'

/**
 * Implementação do gerador de QR Code usando a lib `qrcode`.
 * Gera PNG a partir da URL do pingente.
 */
@Injectable()
export class QrGenerator implements QrGeneratorPort {
  async generatePng(
    url: string,
    options?: QrGeneratorOptions,
  ): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      type: 'png',
      width: options?.size ?? 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
  }
}
