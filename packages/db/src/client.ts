import { Context, Effect, Layer } from "effect"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  { readonly db: DrizzleClient }
>() {}

export const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.sync(() => {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required")
    }
    const client = postgres(connectionString)
    const db = drizzle(client, { schema })
    return { db }
  }),
)
