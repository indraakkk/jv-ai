import { HttpRouter } from "@effect/platform"
import { healthRoutes } from "./routes/health"
import { companyRoutes } from "./routes/companies"
import { pipelineRoutes } from "./routes/pipeline"
import { withErrorHandler } from "./middleware/error-handler"

export const app = HttpRouter.empty.pipe(
  HttpRouter.concat(healthRoutes),
  HttpRouter.concat(companyRoutes),
  HttpRouter.concat(pipelineRoutes),

  // Centralized error handler — maps all route errors to HTTP responses
  withErrorHandler,
)
