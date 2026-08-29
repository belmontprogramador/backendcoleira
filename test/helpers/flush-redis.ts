import Redis from 'ioredis'

/**
 * Helper de teste e2e: limpa o Redis entre suítes/testes.
 * Necessário porque o rate limiting agora usa storage Redis (persistente) —
 * sem o flush, os contadores de throttle acumulam entre testes e estouram o
 * limite (429) em chamadas legítimas.
 */
export async function flushRedis(url: string): Promise<void> {
  const client = new Redis(url)
  await client.flushall()
  await client.quit()
}
