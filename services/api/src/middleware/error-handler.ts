import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"

/**
 * Centralized error handler for the API router.
 *
 * Maps known tagged errors to appropriate HTTP responses:
 * - NotFoundError     -> 404 { error: "Not Found", message }
 * - DatabaseError     -> 500 { error: "Database Error", message }
 * - AiAnalysisError   -> 502 { error: "AI Analysis Error", message }
 * - CollectionError   -> 502 { error: "Collection Error", message }
 * - ParseError        -> 400 { error: "Validation Error", message }
 * - Unknown errors    -> 500 { error: "Internal Server Error" }
 */
export const withErrorHandler = <E, R>(
  router: HttpRouter.HttpRouter<E, R>,
): HttpRouter.HttpRouter<never, R> =>
  HttpRouter.catchAll(router, (error) => {
    const tag = isTaggedError(error) ? error._tag : undefined

    switch (tag) {
      case "NotFoundError": {
        const err = error as { readonly entity: string; readonly id: string }
        return Effect.succeed(
          HttpServerResponse.unsafeJson(
            {
              error: "Not Found",
              message: `${err.entity} with id ${err.id} not found`,
            },
            { status: 404 },
          ),
        )
      }

      case "DatabaseError": {
        const err = error as {
          readonly operation: string
          readonly cause: unknown
        }
        return Effect.succeed(
          HttpServerResponse.unsafeJson(
            {
              error: "Database Error",
              message: `Database operation '${err.operation}' failed: ${String(err.cause)}`,
            },
            { status: 500 },
          ),
        )
      }

      case "AiAnalysisError": {
        const err = error as {
          readonly companyName: string
          readonly cause: unknown
        }
        return Effect.succeed(
          HttpServerResponse.unsafeJson(
            {
              error: "AI Analysis Error",
              message: `AI analysis failed for '${err.companyName}': ${String(err.cause)}`,
            },
            { status: 502 },
          ),
        )
      }

      case "CollectionError": {
        const err = error as {
          readonly source: string
          readonly cause: unknown
        }
        return Effect.succeed(
          HttpServerResponse.unsafeJson(
            {
              error: "Collection Error",
              message: `Collection from '${err.source}' failed: ${String(err.cause)}`,
            },
            { status: 502 },
          ),
        )
      }

      case "ParseError":
        return Effect.succeed(
          HttpServerResponse.unsafeJson(
            {
              error: "Validation Error",
              message: String(error),
            },
            { status: 400 },
          ),
        )

      default:
        return Effect.succeed(
          HttpServerResponse.unsafeJson(
            { error: "Internal Server Error" },
            { status: 500 },
          ),
        )
    }
  })

/**
 * Type guard for tagged errors — checks if an unknown value has a `_tag` string property.
 */
const isTaggedError = (
  error: unknown,
): error is { readonly _tag: string } =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  typeof (error as Record<string, unknown>)._tag === "string"
