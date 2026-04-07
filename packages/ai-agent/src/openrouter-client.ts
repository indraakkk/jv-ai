import { Effect } from "effect"

export interface ChatMessage {
  readonly role: "system" | "user" | "assistant"
  readonly content: string
}

export interface OpenRouterClient {
  readonly chatCompletion: (params: {
    model: string
    messages: ChatMessage[]
    max_tokens: number
  }) => Effect.Effect<string, Error>
}

export const createOpenRouterClient = (apiKey: string): OpenRouterClient => ({
  chatCompletion: (params) =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: () =>
          fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://jackson-ventures.dev",
              "X-Title": "Jackson Ventures AI Agent",
            },
            body: JSON.stringify({
              model: params.model,
              messages: params.messages,
              max_tokens: params.max_tokens,
            }),
          }),
        catch: (error) =>
          new Error(`OpenRouter fetch failed: ${String(error)}`),
      })

      if (!response.ok) {
        const text = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: () =>
            new Error(`OpenRouter API error (${response.status})`),
        })
        return yield* Effect.fail(
          new Error(`OpenRouter API error (${response.status}): ${text}`),
        )
      }

      const data = yield* Effect.tryPromise({
        try: () =>
          response.json() as Promise<{
            choices: Array<{ message: { content: string } }>
          }>,
        catch: (error) =>
          new Error(`OpenRouter response parse failed: ${String(error)}`),
      })

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        return yield* Effect.fail(
          new Error("OpenRouter returned empty response"),
        )
      }

      return content
    }),
})
