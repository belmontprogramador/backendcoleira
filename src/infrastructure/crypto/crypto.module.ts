import { Global, Module } from '@nestjs/common'
import { PASSWORD_HASHER_PORT } from '../../common/ports/password-hasher.port'
import { PASSWORD_GENERATOR_PORT } from '../../common/ports/password-generator.port'
import { IP_HASHER_PORT } from '../../common/ports/ip-hasher.port'
import { BcryptPasswordHasher } from './bcrypt-password.hasher'
import { Sha256IpHasher } from './sha256-ip.hasher'
import { CryptoPasswordGenerator } from './crypto-password.generator'

/**
 * Provê a implementação concreta do hashing de senha (bcrypt) atrás da porta
 * `PASSWORD_HASHER_PORT`. Global — usado por auth e por casos de uso de usuário.
 */
@Global()
@Module({
  providers: [
    BcryptPasswordHasher,
    { provide: PASSWORD_HASHER_PORT, useExisting: BcryptPasswordHasher },
    CryptoPasswordGenerator,
    {
      provide: PASSWORD_GENERATOR_PORT,
      useExisting: CryptoPasswordGenerator,
    },
    Sha256IpHasher,
    { provide: IP_HASHER_PORT, useExisting: Sha256IpHasher },
  ],
  exports: [PASSWORD_HASHER_PORT, PASSWORD_GENERATOR_PORT, IP_HASHER_PORT],
})
export class CryptoModule {}
