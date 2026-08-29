// Prisma 7 — ponto de injeção de configuração do CLI.
// A URL aqui é usada pelo CLI (migrate/generate). Em runtime, a aplicação
// injeta a conexão via driver adapter (@prisma/adapter-pg), então o Prisma
// apenas consome a conexão que recebe — não gerencia pool nem abre conexão.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
