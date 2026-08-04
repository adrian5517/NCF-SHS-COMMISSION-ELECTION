import 'dotenv/config'
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

// .env.local is Next.js's env file; dotenv/config only reads .env, so load
// it explicitly before anything else.
dotenv.config({ path: '.env.local' })

// Prisma 7 moved connection strings out of schema.prisma into this config.
// DATABASE_URL here is the direct Postgres connection string (Supabase "direct"
// / session pooler URL). Adjust the env var names to match .env.local.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
  adapter: async () =>
    new PrismaPg({
      connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
    }),
})
