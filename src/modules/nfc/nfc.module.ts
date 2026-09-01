import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NFC_TAG_REPOSITORY_PORT } from './domain/repositories/nfc-tag.repository.port'
import { BATCH_REPOSITORY_PORT } from './domain/repositories/batch.repository.port'
import { ID_GENERATOR_PORT } from './domain/services/id-generator.port'
import { ACTIVATION_CODE_GENERATOR_PORT } from './domain/services/activation-code-generator.port'
import { ACTIVATION_CODE_CIPHER_PORT } from './domain/services/activation-code-cipher.port'
import { QR_GENERATOR_PORT } from './domain/services/qr-generator.port'
import { PUBLIC_BASE_URL_PORT } from './domain/services/public-base-url.port'
import { CARD_SHEET_PDF_PORT } from './domain/services/card-sheet-pdf.port'
import { NFC_WRITER_PORT } from './domain/services/nfc-writer.port'
import { NFC_READER_PORT } from './domain/services/nfc-reader.port'
import { PrismaNfcTagRepository } from './infrastructure/repositories/prisma-nfc-tag.repository'
import { PrismaBatchRepository } from './infrastructure/repositories/prisma-batch.repository'
import { IdGenerator } from './infrastructure/generators/id-generator'
import { ActivationCodeGenerator } from './infrastructure/generators/activation-code-generator'
import { AesGcmActivationCodeCipher } from './infrastructure/generators/activation-code-cipher'
import { QrGenerator } from './infrastructure/generators/qr-generator'
import { EnvPublicBaseUrl } from './infrastructure/generators/env-public-base-url'
import { PdfKitCardSheetGenerator } from './infrastructure/generators/pdf-kit-card-sheet'
import { MockNfcChip } from './infrastructure/nfc/mock-nfc-chip'
import { MockNfcWriter } from './infrastructure/nfc/mock-nfc-writer'
import { MockNfcReader } from './infrastructure/nfc/mock-nfc-reader'
import { CreateBatchUseCase } from './application/use-cases/create-batch.use-case'
import { GetBatchUseCase } from './application/use-cases/get-batch.use-case'
import { ListBatchesUseCase } from './application/use-cases/list-batches.use-case'
import { GenerateTagsUseCase } from './application/use-cases/generate-tags.use-case'
import { CompleteBatchUseCase } from './application/use-cases/complete-batch.use-case'
import { CancelBatchUseCase } from './application/use-cases/cancel-batch.use-case'
import { GetTagUseCase } from './application/use-cases/get-tag.use-case'
import { ListTagsUseCase } from './application/use-cases/list-tags.use-case'
import { WriteNfcUseCase } from './application/use-cases/write-nfc.use-case'
import { ReportNfcWriteUseCase } from './application/use-cases/report-nfc-write.use-case'
import { GetNextTagToWriteUseCase } from './application/use-cases/get-next-tag-to-write.use-case'
import { ResetTagUseCase } from './application/use-cases/reset-tag.use-case'
import { MarkTagAvailableUseCase } from './application/use-cases/mark-tag-available.use-case'
import { ReprintCodeUseCase } from './application/use-cases/reprint-code.use-case'
import { VerifyNfcUseCase } from './application/use-cases/verify-nfc.use-case'
import { GenerateQrUseCase } from './application/use-cases/generate-qr.use-case'
import { GenerateBatchSheetUseCase } from './application/use-cases/generate-batch-sheet.use-case'
import { AdminBatchesController } from './presentation/controllers/admin-batches.controller'
import { AdminTagsController } from './presentation/controllers/admin-tags.controller'

/**
 * Módulo NFC/QR — produção de pingentes.
 * Provê implementações concretas atrás das portas (DIP).
 *
 * Nota: `MockNfcWriter`/`MockNfcReader` simulam o hardware em dev/teste.
 * Em produção, trocar pela implementação que fala com o leitor USB.
 */
@Module({
  controllers: [AdminBatchesController, AdminTagsController],
  providers: [
    PrismaNfcTagRepository,
    { provide: NFC_TAG_REPOSITORY_PORT, useClass: PrismaNfcTagRepository },
    PrismaBatchRepository,
    { provide: BATCH_REPOSITORY_PORT, useClass: PrismaBatchRepository },
    IdGenerator,
    { provide: ID_GENERATOR_PORT, useClass: IdGenerator },
    ActivationCodeGenerator,
    {
      provide: ACTIVATION_CODE_GENERATOR_PORT,
      useClass: ActivationCodeGenerator,
    },
    {
      provide: ACTIVATION_CODE_CIPHER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new AesGcmActivationCodeCipher(
          config.get<string>('ACTIVATION_CODE_ENC_KEY') ?? '',
        ),
    },
    QrGenerator,
    { provide: QR_GENERATOR_PORT, useClass: QrGenerator },
    EnvPublicBaseUrl,
    { provide: PUBLIC_BASE_URL_PORT, useClass: EnvPublicBaseUrl },
    PdfKitCardSheetGenerator,
    { provide: CARD_SHEET_PDF_PORT, useClass: PdfKitCardSheetGenerator },
    MockNfcChip,
    MockNfcWriter,
    { provide: NFC_WRITER_PORT, useExisting: MockNfcWriter },
    MockNfcReader,
    { provide: NFC_READER_PORT, useExisting: MockNfcReader },
    CreateBatchUseCase,
    GetBatchUseCase,
    ListBatchesUseCase,
    GenerateTagsUseCase,
    CompleteBatchUseCase,
    CancelBatchUseCase,
    GetTagUseCase,
    ListTagsUseCase,
    WriteNfcUseCase,
    ReportNfcWriteUseCase,
    GetNextTagToWriteUseCase,
    ResetTagUseCase,
    MarkTagAvailableUseCase,
    ReprintCodeUseCase,
    VerifyNfcUseCase,
    GenerateQrUseCase,
    GenerateBatchSheetUseCase,
  ],
  exports: [
    NFC_TAG_REPOSITORY_PORT,
    BATCH_REPOSITORY_PORT,
    ACTIVATION_CODE_GENERATOR_PORT,
    ACTIVATION_CODE_CIPHER_PORT,
    ID_GENERATOR_PORT,
    CARD_SHEET_PDF_PORT,
    CreateBatchUseCase,
    GetBatchUseCase,
    ListBatchesUseCase,
    GenerateTagsUseCase,
    CompleteBatchUseCase,
    CancelBatchUseCase,
    GetTagUseCase,
    ListTagsUseCase,
    WriteNfcUseCase,
    ReportNfcWriteUseCase,
    GetNextTagToWriteUseCase,
    ResetTagUseCase,
    MarkTagAvailableUseCase,
    ReprintCodeUseCase,
    VerifyNfcUseCase,
    GenerateQrUseCase,
    GenerateBatchSheetUseCase,
  ],
})
export class NfcModule {}
