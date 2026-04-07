import { Effect, pipe, Schema } from "effect"
import Anthropic from "@anthropic-ai/sdk"
import { AiAnalysisError } from "@jackson-ventures/shared"
import {
  RESEARCH_SYSTEM_PROMPT,
  buildResearchUserPrompt,
} from "../prompts/research-prompt"

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
  client: Anthropic,
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
    Effect.tryPromise({
      try: () =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: RESEARCH_SYSTEM_PROMPT,
          messages: [
            { role: "user", content: buildResearchUserPrompt(input) },
          ],
        }),
      catch: (cause) =>
        new AiAnalysisError({
          companyName: input.companyName,
          cause,
        }),
    }),
    Effect.flatMap((response) => {
      const text =
        response.content[0]?.type === "text" ? response.content[0].text : ""
      return pipe(
        Effect.try(() => JSON.parse(text)),
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
