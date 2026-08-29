import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { BATCH_REPOSITORY_PORT } from '../../domain/repositories/batch.repository.port'
import type { BatchRepositoryPort } from '../../domain/repositories/batch.repository.port'
import { NFC_TAG_REPOSITORY_PORT } from '../../domain/repositories/nfc-tag.repository.port'
import type { NfcTagRepositoryPort } from '../../domain/repositories/nfc-tag.repository.port'
import { ID_GENERATOR_PORT } from '../../domain/services/id-generator.port'
import type { IdGeneratorPort } from '../../domain/services/id-generator.port'
import { ACTIVATION_CODE_GENERATOR_PORT } from '../../domain/services/activation-code-generator.port'
import type { ActivationCodeGeneratorPort } from '../../domain/services/activation-code-generator.port'
import { ACTIVATION_CODE_CIPHER_PORT } from '../../domain/services/activation-code-cipher.port'
import type { ActivationCodeCipherPort } from '../../domain/services/activation-code-cipher.port'
import { AUDIT_LOGGER_PORT } from '../../../../common/ports/audit-logger.port'
import type { AuditLoggerPort } from '../../../../common/ports/audit-logger.port'
import { NfcTag } from '../../domain/entities/nfc-tag.entity'
import { PublicId } from '../../domain/value-objects/public-id.vo'
import { ActivationCode } from '../../domain/value-objects/activation-code.vo'
import { BatchNotFoundError } from '../errors'

export interface GenerateTagsResult {
  tags: NfcTag[]
  /** Códigos em texto puro — exibidos UMA vez (impressão do cartão). */
  codes: string[]
}

/**
 * Caso de uso: gerar as tags de um lote (Public IDs + Activation Codes).
 *
 * Segurança: os códigos em texto puro são retornados UMA única vez para a
 * impressão do cartão. No banco, grava-se apenas o ciphertext (AES-256-GCM) —
 * recuperável sob demanda via `ReprintCodeUseCase`.
 */
@Injectable()
export class GenerateTagsUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY_PORT)
    private readonly batches: BatchRepositoryPort,
    @Inject(NFC_TAG_REPOSITORY_PORT)
    private readonly tags: NfcTagRepositoryPort,
    @Inject(ID_GENERATOR_PORT) private readonly idGen: IdGeneratorPort,
    @Inject(ACTIVATION_CODE_GENERATOR_PORT)
    private readonly codeGen: ActivationCodeGeneratorPort,
    @Inject(ACTIVATION_CODE_CIPHER_PORT)
    private readonly cipher: ActivationCodeCipherPort,
    @Inject(AUDIT_LOGGER_PORT) private readonly audit: AuditLoggerPort,
  ) {}

  async execute(
    operatorId: string,
    batchId: string,
  ): Promise<GenerateTagsResult> {
    const batch = await this.batches.findById(batchId)
    if (!batch) {
      throw new BatchNotFoundError(batchId)
    }

    batch.startGenerating()
    await this.batches.save(batch)

    const createdTags: NfcTag[] = []
    const plainCodes: string[] = []

    for (let i = 0; i < batch.quantity; i++) {
      const publicId = PublicId.create(this.idGen.generatePublicId())
      const code = await this.codeGen.generate()
      const encrypted = this.cipher.encrypt(code)

      const tag = NfcTag.create({
        id: randomUUID(),
        publicId,
        activationCodeEncrypted: encrypted,
        batchId: batch.id,
      })

      createdTags.push(tag)
      plainCodes.push(ActivationCode.create(code).value)
    }

    await this.tags.saveMany(createdTags)

    batch.finishGeneration(createdTags.length)
    await this.batches.save(batch)

    await this.audit.log({
      action: 'tags_generate',
      entity: 'batch',
      entityId: batch.id,
      metadata: { count: createdTags.length },
    })

    return { tags: createdTags, codes: plainCodes }
  }
}
