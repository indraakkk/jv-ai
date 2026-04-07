import { Effect, pipe, Schema } from "effect"

import {
  AiAnalysisError,
  AiAnalysisOutput,
} from "@jackson-ventures/shared"

import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
} from "../prompts/analysis-prompt"
import type { OpenRouterClient } from "../openrouter-client"
import { sanitizeJsonResponse } from "../sanitize-json"

const MODEL =
  process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-super-120b-a12b:free"

export const analyzeCompany = (
  client: OpenRouterClient,
  input: {
    companyName: string
    description: string | null
    website: string | null
  },
  retryCount = 0,
): Effect.Effect<{ analysis: AiAnalysisOutput; rawResponse: string }, AiAnalysisError> =>
  pipe(
    client.chatCompletion({
      model: MODEL,
      max_tokens: 500,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: buildAnalysisUserPrompt(input) },
      ],
    }),
    Effect.mapError(
      (cause) =>
        new AiAnalysisError({ companyName: input.companyName, cause }),
    ),
    Effect.flatMap((text) => {
      const sanitized = sanitizeJsonResponse(text)

      return pipe(
        Effect.try(() => JSON.parse(sanitized)),
        Effect.flatMap(Schema.decodeUnknown(AiAnalysisOutput)),
        Effect.map((analysis) => ({
          analysis,
          rawResponse: sanitized,
        })),
        Effect.catchAll((parseError) => {
          if (retryCount < 3) {
            console.log(
              `Parse error for ${input.companyName}, retrying (${retryCount + 1}/3)...`,
            )
            return analyzeCompany(client, input, retryCount + 1)
          }
          return Effect.fail(
            new AiAnalysisError({
              companyName: input.companyName,
              cause: parseError,
            }),
          )
        }),
      )
    }),
  )
