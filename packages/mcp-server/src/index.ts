import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod/v4"
import { Effect, Layer, pipe } from "effect"
import {
  DatabaseServiceLive,
  CompanyRepositoryLive,
  CompanyRepository,
} from "@jackson-ventures/db"
import { CollectorServiceLive, CollectorService } from "@jackson-ventures/collector"
import { AiServiceLive, AiService } from "@jackson-ventures/ai-agent"

const AppLayer = pipe(
  Layer.mergeAll(CompanyRepositoryLive, AiServiceLive, CollectorServiceLive),
  Layer.provide(DatabaseServiceLive),
)

const runEffect = <A>(effect: Effect.Effect<A, unknown, unknown>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.provide(AppLayer)) as Effect.Effect<A, never, never>)

const server = new McpServer({
  name: "jackson-ventures",
  version: "0.1.0",
})

server.tool(
  "research-company",
  "Research and analyze a company using the AI agent pipeline. Collects data, enriches it, and produces structured analysis.",
  {
    companyName: z.string().describe("The company name to research"),
    website: z.string().optional().describe("Company website URL"),
    description: z
      .string()
      .optional()
      .describe("Brief description of the company"),
  },
  async ({ companyName, website, description }) => {
    const result = await runEffect(
      pipe(
        Effect.all([CompanyRepository, AiService]),
        Effect.flatMap(([repo, ai]) =>
          pipe(
            repo.insertMany([
              {
                companyName,
                website: website ?? null,
                description: description ?? null,
                source: "mcp",
              },
            ]),
            Effect.flatMap((inserted) => {
              const company = inserted[0]!
              return pipe(
                ai.enrichAndAnalyze({
                  companyName: company.companyName,
                  description: company.description,
                  website: company.website,
                }),
                Effect.flatMap(({ analysis, rawResponse }) =>
                  repo.updateAnalysis(company.id, analysis, rawResponse),
                ),
              )
            }),
          ),
        ),
      ),
    )

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  },
)

server.tool(
  "list-companies",
  "List all analyzed companies, optionally filtered by industry.",
  {
    industry: z.string().optional().describe("Filter by industry"),
    search: z.string().optional().describe("Search term"),
  },
  async ({ industry, search }) => {
    const companies = await runEffect(
      pipe(
        CompanyRepository,
        Effect.flatMap((repo) => repo.findAll({ industry, search })),
      ),
    )

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(companies, null, 2),
        },
      ],
    }
  },
)

server.tool(
  "get-company",
  "Get full details for a specific company by ID.",
  { id: z.string().describe("Company UUID") },
  async ({ id }) => {
    const company = await runEffect(
      pipe(
        CompanyRepository,
        Effect.flatMap((repo) => repo.findById(id)),
      ),
    )

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(company, null, 2),
        },
      ],
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
