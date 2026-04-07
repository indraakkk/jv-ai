import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, pipe } from "effect"
import { CompanyRepository } from "@jackson-ventures/db"
import { CollectorService } from "@jackson-ventures/collector"
import { AiService } from "@jackson-ventures/ai-agent"

export const pipelineRoutes = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/pipeline/run",
    pipe(
      HttpServerRequest.HttpServerRequest,
      Effect.flatMap((req) => req.json),
      Effect.catchAll(() => Effect.succeed({ source: "all", count: 10 })),
      Effect.flatMap((body: any) => {
        const source: string = body.source ?? "all"
        const count: number = body.count ?? 10

        return pipe(
          Effect.all([CollectorService, CompanyRepository, AiService]),
          Effect.flatMap(([collector, repo, ai]) =>
            pipe(
              // Step 1: Collect companies
              source === "seed"
                ? collector.collectFromSeed()
                : source === "github"
                  ? collector.collectFromGitHub(count)
                  : collector.collectAll(count),
              Effect.catchAll(() => collector.collectFromSeed()),
              // Step 2: Store in database
              Effect.flatMap((companies) => repo.insertMany(companies)),
              // Step 3: Analyze each company via AI pipeline
              Effect.flatMap((inserted) =>
                pipe(
                  Effect.all(
                    inserted.map((company) =>
                      pipe(
                        repo.updateAnalysisStatus(company.id, "analyzing"),
                        Effect.flatMap(() =>
                          ai.enrichAndAnalyze({
                            companyName: company.companyName,
                            description: company.description,
                            website: company.website,
                          }),
                        ),
                        Effect.flatMap(({ analysis, rawResponse }) =>
                          repo.updateAnalysis(company.id, analysis, rawResponse),
                        ),
                        Effect.catchAll((err) =>
                          pipe(
                            repo.updateAnalysisStatus(company.id, "failed"),
                            Effect.map(() => ({
                              ...company,
                              error: String(err),
                            })),
                          ),
                        ),
                      ),
                    ),
                    { concurrency: 3 },
                  ),
                  Effect.map((results) => {
                    const completed = results.filter(
                      (r: any) => !r.error && r.analysisStatus === "completed",
                    )
                    const failed = results.filter((r: any) => r.error || r.analysisStatus === "failed")
                    return {
                      collected: inserted.length,
                      analyzed: completed.length,
                      failed: failed.length,
                    }
                  }),
                ),
              ),
            ),
          ),
          Effect.map((result) => HttpServerResponse.unsafeJson(result)),
        )
      }),
    ),
  ),

  // Re-analyze pending companies
  HttpRouter.post(
    "/pipeline/analyze-pending",
    pipe(
      Effect.all([CompanyRepository, AiService]),
      Effect.flatMap(([repo, ai]) =>
        pipe(
          repo.findPendingAnalysis(),
          Effect.flatMap((pending) =>
            Effect.all(
              pending.map((company) =>
                pipe(
                  repo.updateAnalysisStatus(company.id, "analyzing"),
                  Effect.flatMap(() =>
                    ai.enrichAndAnalyze({
                      companyName: company.companyName,
                      description: company.description,
                      website: company.website,
                    }),
                  ),
                  Effect.flatMap(({ analysis, rawResponse }) =>
                    repo.updateAnalysis(company.id, analysis, rawResponse),
                  ),
                  // Per-company failure recovery: mark individual company as failed
                  Effect.catchAll(() =>
                    repo.updateAnalysisStatus(company.id, "failed"),
                  ),
                ),
              ),
              { concurrency: 3 },
            ),
          ),
          Effect.map((results) => ({
            analyzed: results.length,
          })),
        ),
      ),
      Effect.map((result) => HttpServerResponse.unsafeJson(result)),
    ),
  ),
)
