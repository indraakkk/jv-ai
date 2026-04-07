import { Effect, pipe, Schema } from "effect"

import { AiAnalysisError } from "@jackson-ventures/shared"

import {
  RESEARCH_SYSTEM_PROMPT,
  buildResearchUserPrompt,
} from "../prompts/research-prompt"
import type { OpenRouterClient } from "../openrouter-client"
import { sanitizeJsonResponse } from "../sanitize-json"

const MODEL =
  process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3-super-120b-a12b:free"

const ResearchOutput = Schema.Struct({
  description: Schema.String,
  website: Schema.NullOr(Schema.String),
})

export interface EnrichedCompanyData {
  readonly companyName: string
  readonly description: string
  readonly website: string | null
}

export const enrichCompany = (
  client: OpenRouterClient,
  input: {
    companyName: string
    description: string | null
    website: string | null
  },
): Effect.Effect<EnrichedCompanyData, AiAnalysisError> => {
  if (input.description && input.description.length > 30) {
    return Effect.succeed({
      companyName: input.companyName,
      description: input.description,
      website: input.website,
    })
  }

  return pipe(
    client.chatCompletion({
      model: MODEL,
      max_tokens: 300,
      messages: [
        { role: "system", content: RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: buildResearchUserPrompt(input) },
      ],
    }),
    Effect.mapError(
      (cause) =>
        new AiAnalysisError({
          companyName: input.companyName,
          cause,
        }),
    ),
    Effect.flatMap((text) => {
      const sanitized = sanitizeJsonResponse(text)
      return pipe(
        Effect.try(() => JSON.parse(sanitized)),
        Effect.flatMap(Schema.decodeUnknown(ResearchOutput)),
        Effect.map((parsed) => ({
          companyName: input.companyName,
          description: parsed.description,
          website: parsed.website ?? input.website,
        })),
        Effect.catchAll(() =>
          Effect.succeed({
            companyName: input.companyName,
            description:
              input.description ?? `${input.companyName} — technology company.`,
            website: input.website,
          }),
        ),
      )
    }),
  )
}
