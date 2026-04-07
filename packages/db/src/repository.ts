import { Context, Effect, Layer, pipe } from "effect"
import { eq, ilike, or, sql } from "drizzle-orm"
import { DatabaseError, NotFoundError } from "@jackson-ventures/shared"
import type { AiAnalysisOutput, RawCompanyInput } from "@jackson-ventures/shared"
import { DatabaseService, type DrizzleClient } from "./client"
import { companies, type Company } from "./schema"

export interface CompanyFilters {
  readonly industry?: string
  readonly search?: string
  readonly limit?: number
  readonly offset?: number
}

export class CompanyRepository extends Context.Tag("CompanyRepository")<
  CompanyRepository,
  {
    readonly findAll: (
      filters?: CompanyFilters,
    ) => Effect.Effect<ReadonlyArray<Company>, DatabaseError>
    readonly findById: (
      id: string,
    ) => Effect.Effect<Company, NotFoundError | DatabaseError>
    readonly insertMany: (
      data: ReadonlyArray<RawCompanyInput>,
    ) => Effect.Effect<ReadonlyArray<Company>, DatabaseError>
    readonly updateAnalysis: (
      id: string,
      analysis: AiAnalysisOutput,
      rawResponse: string,
    ) => Effect.Effect<Company, NotFoundError | DatabaseError>
    readonly updateAnalysisStatus: (
      id: string,
      status: "pending" | "analyzing" | "completed" | "failed",
    ) => Effect.Effect<void, DatabaseError>
    readonly findPendingAnalysis: () => Effect.Effect<
      ReadonlyArray<Company>,
      DatabaseError
    >
  }
>() {}

const makeRepository = (db: DrizzleClient) => ({
  findAll: (filters?: CompanyFilters) =>
    Effect.tryPromise({
      try: async () => {
        const conditions = []
        if (filters?.industry) {
          conditions.push(eq(companies.industry, filters.industry as any))
        }
        if (filters?.search) {
          conditions.push(
            or(
              ilike(companies.companyName, `%${filters.search}%`),
              ilike(companies.description, `%${filters.search}%`),
              ilike(companies.summary, `%${filters.search}%`),
            )!,
          )
        }

        let query = db.select().from(companies)
        if (conditions.length > 0) {
          query = query.where(
            conditions.length === 1 ? conditions[0]! : or(...conditions)!,
          ) as any
        }

        const limit = filters?.limit ?? 100
        const offset = filters?.offset ?? 0
        return await (query as any).limit(limit).offset(offset)
      },
      catch: (cause) =>
        new DatabaseError({ operation: "findAll", cause }),
    }),

  findById: (id: string) =>
    pipe(
      Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(companies)
            .where(eq(companies.id, id))
            .then((rows) => rows[0]),
        catch: (cause) =>
          new DatabaseError({ operation: "findById", cause }),
      }),
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(row)
          : Effect.fail(new NotFoundError({ entity: "Company", id })),
      ),
    ),

  insertMany: (data: ReadonlyArray<RawCompanyInput>) =>
    Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const rows = await tx
            .insert(companies)
            .values(
              data.map((d) => ({
                companyName: d.companyName,
                description: d.description,
                website: d.website,
                source: d.source ?? "unknown",
              })),
            )
            .returning()
          return rows
        }),
      catch: (cause) =>
        new DatabaseError({ operation: "insertMany", cause }),
    }),

  updateAnalysis: (
    id: string,
    analysis: AiAnalysisOutput,
    rawResponse: string,
  ) =>
    pipe(
      Effect.tryPromise({
        try: () =>
          db
            .update(companies)
            .set({
              industry: analysis.industry as any,
              businessModel: analysis.business_model as any,
              summary: analysis.summary,
              useCase: analysis.use_case,
              analysisStatus: "completed" as const,
              rawAiResponse: rawResponse,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, id))
            .returning()
            .then((rows) => rows[0]),
        catch: (cause) =>
          new DatabaseError({ operation: "updateAnalysis", cause }),
      }),
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(row)
          : Effect.fail(new NotFoundError({ entity: "Company", id })),
      ),
    ),

  updateAnalysisStatus: (
    id: string,
    status: "pending" | "analyzing" | "completed" | "failed",
  ) =>
    Effect.tryPromise({
      try: () =>
        db
          .update(companies)
          .set({ analysisStatus: status, updatedAt: new Date() })
          .where(eq(companies.id, id))
          .then(() => undefined),
      catch: (cause) =>
        new DatabaseError({ operation: "updateAnalysisStatus", cause }),
    }),

  findPendingAnalysis: () =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(companies)
          .where(eq(companies.analysisStatus, "pending")),
      catch: (cause) =>
        new DatabaseError({ operation: "findPendingAnalysis", cause }),
    }),
})

export const CompanyRepositoryLive = Layer.effect(
  CompanyRepository,
  Effect.map(DatabaseService, ({ db }) => makeRepository(db)),
)
