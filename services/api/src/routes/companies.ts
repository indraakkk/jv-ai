import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, pipe } from "effect"
import { CompanyRepository } from "@jackson-ventures/db"

export const companyRoutes = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/companies",
    pipe(
      HttpServerRequest.HttpServerRequest,
      Effect.flatMap((req) => {
        const url = new URL(req.url, "http://localhost")
        const industry = url.searchParams.get("industry") ?? undefined
        const search = url.searchParams.get("search") ?? url.searchParams.get("q") ?? undefined
        const limit = Number(url.searchParams.get("limit") ?? "100")
        const offset = Number(url.searchParams.get("offset") ?? "0")

        return pipe(
          CompanyRepository,
          Effect.flatMap((repo) =>
            repo.findAll({ industry, search, limit, offset }),
          ),
          Effect.map((companies) =>
            HttpServerResponse.unsafeJson(companies),
          ),
        )
      }),
    ),
  ),

  HttpRouter.get(
    "/companies/:id",
    pipe(
      HttpRouter.params,
      Effect.flatMap((params) => {
        const id = params.id as string
        return pipe(
          CompanyRepository,
          Effect.flatMap((repo) => repo.findById(id)),
          Effect.map((company) =>
            HttpServerResponse.unsafeJson(company),
          ),
        )
      }),
    ),
  ),
)
