import { Context, Effect, Layer, pipe } from "effect"

import { AiAnalysisError } from "@jackson-ventures/shared"
import type { AiAnalysisOutput } from "@jackson-ventures/shared"

import { enrichCompany, type EnrichedCompanyData } from "./agents/research-agent"
import { analyzeCompany } from "./agents/analysis-agent"
import {
  createOpenRouterClient,
  type OpenRouterClient,
} from "./openrouter-client"

export class AiService extends Context.Tag("AiService")<
  AiService,
  {
    readonly enrichCompany: (input: {
      companyName: string
      description: string | null
      website: string | null
    }) => Effect.Effect<EnrichedCompanyData, AiAnalysisError>
    readonly analyzeCompany: (input: {
      companyName: string
      description: string | null
      website: string | null
    }) => Effect.Effect<
      { analysis: AiAnalysisOutput; rawResponse: string },
      AiAnalysisError
    >
    readonly enrichAndAnalyze: (input: {
      companyName: string
      description: string | null
      website: string | null
    }) => Effect.Effect<
      { analysis: AiAnalysisOutput; rawResponse: string },
      AiAnalysisError
    >
  }
>() {}

/**
 * Lazily resolves the OpenRouter client at call time, returning an
 * AiAnalysisError through the Effect error channel when the API key
 * is missing instead of crashing the process at Layer construction.
 * Uses the cleanEnv pattern to strip CLAUDECODE from the environment.
 */
const getClient = (): Effect.Effect<OpenRouterClient, AiAnalysisError> => {
  const cleanEnv = { ...process.env }
  delete (cleanEnv as Record<string, unknown>).CLAUDECODE
  const apiKey = cleanEnv.OPENROUTER_API_KEY
  if (!apiKey) {
    return Effect.fail(
      new AiAnalysisError({
        companyName: "unknown",
        cause: "OPENROUTER_API_KEY environment variable is required",
      }),
    )
  }
  return Effect.succeed(createOpenRouterClient(apiKey))
}

export const AiServiceLive = Layer.succeed(AiService, {
  enrichCompany: (input) =>
    pipe(
      getClient(),
      Effect.flatMap((client) => enrichCompany(client, input)),
    ),

  analyzeCompany: (input) =>
    pipe(
      getClient(),
      Effect.flatMap((client) => analyzeCompany(client, input)),
    ),

  enrichAndAnalyze: (input) =>
    pipe(
      getClient(),
      Effect.flatMap((client) =>
        pipe(
          enrichCompany(client, input),
          Effect.flatMap((enriched) =>
            analyzeCompany(client, {
              companyName: enriched.companyName,
              description: enriched.description,
              website: enriched.website,
            }),
          ),
        ),
      ),
    ),
})
