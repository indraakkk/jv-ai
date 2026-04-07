import { Data } from "effect"

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly entity: string
  readonly id: string
}> {}

export class AiAnalysisError extends Data.TaggedError("AiAnalysisError")<{
  readonly companyName: string
  readonly cause: unknown
}> {}

export class CollectionError extends Data.TaggedError("CollectionError")<{
  readonly source: string
  readonly cause: unknown
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly operation: string
  readonly cause: unknown
}> {}
