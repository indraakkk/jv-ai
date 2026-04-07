import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"

export const healthRoutes = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/health",
    Effect.map(
      Effect.sync(() => ({
        status: "ok" as const,
        timestamp: new Date().toISOString(),
      })),
      (data) => HttpServerResponse.unsafeJson(data),
    ),
  ),
)
