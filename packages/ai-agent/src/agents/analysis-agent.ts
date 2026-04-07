import { Effect, pipe, Schema } from "effect"
import Anthropic from "@anthropic-ai/sdk"
import {
  AiAnalysisError,
  AiAnalysisOutput,
} from "@jackson-ventures/shared"
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
} from "../prompts/analysis-prompt"

export const analyzeCompany = (
  client: Anthropic,
  input: {
    companyName: string
    description: string | null
    website: string | null
  },
  retryCount = 0,
): Effect.Effect<{ analysis: AiAnalysisOutput; rawResponse: string }, AiAnalysisError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: ANALYSIS_SYSTEM_PROMPT,
          messages: [
            { role: "user", content: buildAnalysisUserPrompt(input) },
          ],
        }),
      catch: (cause) =>
        new AiAnalysisError({ companyName: input.companyName, cause }),
    }),
    Effect.flatMap((response) => {
      const text =
        response.content[0]?.type === "text" ? response.content[0].text : ""

      return pipe(
        Effect.try(() => JSON.parse(text)),
        Effect.flatMap(Schema.decodeUnknown(AiAnalysisOutput)),
        Effect.map((analysis) => ({
          analysis,
          rawResponse: text,
        })),
        Effect.catchAll((parseError) => {
          if (retryCount < 2) {
            console.log(
              `Parse error for ${input.companyName}, retrying (${retryCount + 1}/2)...`,
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
