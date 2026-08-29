"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_service_1 = require("../src/infrastructure/database/prisma.service");
const bcrypt_password_hasher_1 = require("../src/infrastructure/crypto/bcrypt-password.hasher");
const seed_runner_1 = require("../src/infrastructure/seed/seed.runner");
async function main() {
    const config = {
        getOrThrow: (key) => {
            const map = {
                DATABASE_URL: process.env.DATABASE_URL ?? '',
            };
            const value = map[key];
            if (!value) {
                throw new Error(`Missing env var: ${key}`);
            }
            return value;
        },
    };
    const prisma = new prisma_service_1.PrismaService(config);
    const hasher = new bcrypt_password_hasher_1.BcryptPasswordHasher();
    const runner = new seed_runner_1.SeedRunner(prisma, hasher);
    try {
        await runner.run();
        console.log('Seed concluída com sucesso. 🌱');
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch(error => {
    console.error('Seed falhou:', error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map