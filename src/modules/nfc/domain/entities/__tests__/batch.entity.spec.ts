import {
  Batch,
  BatchStatus,
  InvalidBatchStatusTransitionError,
} from '../batch.entity'

describe('Batch (agregado)', () => {
  function makeBatch(): Batch {
    return Batch.create({
      id: 'batch-1',
      name: 'Lote 001 - Agosto 2026',
      quantity: 1000,
      createdBy: 'operator-1',
    })
  }

  it('cria um lote em PENDING com contadores zerados', () => {
    const batch = makeBatch()
    expect(batch.status).toBe(BatchStatus.PENDING)
    expect(batch.quantity).toBe(1000)
    expect(batch.generatedCount).toBe(0)
    expect(batch.writtenCount).toBe(0)
    expect(batch.verifiedCount).toBe(0)
    expect(batch.failedCount).toBe(0)
  })

  it('percorre o fluxo: PENDING → GENERATING → GENERATED → WRITING → COMPLETED', () => {
    const batch = makeBatch()

    batch.startGenerating()
    expect(batch.status).toBe(BatchStatus.GENERATING)

    batch.finishGeneration(1000)
    expect(batch.status).toBe(BatchStatus.GENERATED)
    expect(batch.generatedCount).toBe(1000)

    batch.startWriting()
    expect(batch.status).toBe(BatchStatus.WRITING)

    batch.complete()
    expect(batch.status).toBe(BatchStatus.COMPLETED)
    expect(batch.completedAt).not.toBeNull()
  })

  it('incrementa contadores de escrita e verificação', () => {
    const batch = makeBatch()
    batch.startGenerating()
    batch.finishGeneration(1000)
    batch.startWriting()

    batch.incrementWritten()
    batch.incrementWritten()
    batch.incrementVerified()
    batch.incrementFailed()

    expect(batch.writtenCount).toBe(2)
    expect(batch.verifiedCount).toBe(1)
    expect(batch.failedCount).toBe(1)
  })

  it('decrementa o contador de gravados com piso zero', () => {
    const batch = makeBatch()
    batch.startGenerating()
    batch.finishGeneration(1000)
    batch.startWriting()

    batch.incrementWritten()
    batch.incrementWritten()
    batch.decrementWritten()
    expect(batch.writtenCount).toBe(1)

    // piso: nunca fica negativo
    batch.decrementWritten()
    batch.decrementWritten()
    expect(batch.writtenCount).toBe(0)
  })

  it('rejeita finalizar geração sem ter iniciado', () => {
    const batch = makeBatch()
    expect(() => batch.finishGeneration(10)).toThrow(
      InvalidBatchStatusTransitionError,
    )
  })

  it('cancela um lote com motivo', () => {
    const batch = makeBatch()
    batch.cancel('Erro de fabricação')

    expect(batch.status).toBe(BatchStatus.CANCELLED)
    expect(batch.cancelledAt).not.toBeNull()
    expect(batch.cancelReason).toBe('Erro de fabricação')
  })

  it('reconstitui a partir de dados persistidos', () => {
    const batch = Batch.reconstitute({
      id: 'batch-1',
      name: 'Lote 001',
      description: null,
      prefix: null,
      externalRef: null,
      quantity: 100,
      status: BatchStatus.GENERATED,
      generatedCount: 100,
      writtenCount: 0,
      verifiedCount: 0,
      failedCount: 0,
      createdBy: 'operator-1',
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    expect(batch.id).toBe('batch-1')
    expect(batch.status).toBe(BatchStatus.GENERATED)
    expect(batch.generatedCount).toBe(100)
  })
})
