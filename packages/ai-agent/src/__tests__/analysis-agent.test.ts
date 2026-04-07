import { describe, expect, test } from "bun:test"

import { Effect, pipe, Schema } from "effect"
import { AiAnalysisError, AiAnalysisOutput } from "@jackson-ventures/shared"

import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
} from "../prompts/analysis-prompt"
import { analyzeCompany } from "../agents/analysis-agent"

// ---------------------------------------------------------------------------
// Prompt builder tests
// ---------------------------------------------------------------------------
describe("buildAnalysisUserPrompt", () => {
  test("includes company name in prompt", () => {
    const prompt = buildAnalysisUserPrompt({
      companyName: "TestCorp",
      description: "A testing company",
      website: "https://testcorp.com",
    })
    expect(prompt).toContain("TestCorp")
  })

  test("includes website in prompt", () => {
    const prompt = buildAnalysisUserPrompt({
      companyName: "TestCorp",
      description: null,
      website: "https://testcorp.com",
    })
    expect(prompt).toContain("https://testcorp.com")
  })

  test("includes description in prompt", () => {
    const prompt = buildAnalysisUserPrompt({
      companyName: "TestCorp",
      description: "Builds automated testing tools for enterprises",
      website: null,
    })
    expect(prompt).toContain("Builds automated testing tools for enterprises")
  })

  test("uses fallback text when description is null", () => {
    const prompt = buildAnalysisUserPrompt({
      companyName: "NullDesc",
      description: null,
      website: "https://example.com",
    })
    expect(prompt).toContain("No description available")
  })

  test("uses fallback text when website is null", () => {
    const prompt = buildAnalysisUserPrompt({
      companyName: "NullSite",
      description: "Some description",
      website: null,
    })
    expect(prompt).toContain("No website available")
  })

  test("includes industry values in prompt", () => {
    const prompt = buildAnalysisUserPrompt({
      companyName: "Anything",
      description: null,
      website: null,
    })
    expect(prompt).toContain("FinTech")
    expect(prompt).toContain("AI/ML")
    expect(prompt).toContain("Developer Tools")
  })

  test("includes business model values in prompt", () => {
    const prompt = buildAnalysisUserPrompt({
      companyName: "Anything",
      description: null,
      website: null,
    })
    expect(prompt).toContain("B2B")
    expect(prompt).toContain("SaaS")
    expect(prompt).toContain("Enterprise")
  })

  test("includes JSON field names in prompt", () => {
    const prompt = buildAnalysisUserPrompt({
      companyName: "Anything",
      description: null,
      website: null,
    })
    expect(prompt).toContain('"industry"')
    expect(prompt).toContain('"business_model"')
    expect(prompt).toContain('"summary"')
    expect(prompt).toContain('"use_case"')
  })
})

// ---------------------------------------------------------------------------
// System prompt tests
// ---------------------------------------------------------------------------
describe("ANALYSIS_SYSTEM_PROMPT", () => {
  test("instructs the model to respond with JSON", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("JSON")
  })

  test("instructs no markdown", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("No markdown")
  })

  test("is a non-empty string", () => {
    expect(typeof ANALYSIS_SYSTEM_PROMPT).toBe("string")
    expect(ANALYSIS_SYSTEM_PROMPT.length).toBeGreaterThan(10)
  })
})

// ---------------------------------------------------------------------------
// AiAnalysisOutput schema validation (used by analysis-agent for parsing)
// ---------------------------------------------------------------------------
describe("AiAnalysisOutput schema parsing", () => {
  const decode = Schema.decodeUnknownSync(AiAnalysisOutput)

  test("parses valid JSON response from AI", () => {
    const raw = JSON.stringify({
      industry: "Developer Tools",
      business_model: "SaaS",
      summary:
        "Provides a cloud deployment platform for frontend applications.",
      use_case:
        "A development team could use this platform to deploy and preview pull requests automatically before merging.",
    })
    const parsed = JSON.parse(raw)
    const result = decode(parsed)
    expect(result.industry).toBe("Developer Tools")
    expect(result.business_model).toBe("SaaS")
  })

  test("rejects partial JSON missing required fields", () => {
    const partial = { industry: "AI/ML" }
    expect(() => decode(partial)).toThrow()
  })

  test("rejects response with wrong enum value", () => {
    const bad = {
      industry: "Blockchain",
      business_model: "SaaS",
      summary: "A blockchain company that does things.",
      use_case: "Use this for decentralized application management.",
    }
    expect(() => decode(bad)).toThrow()
  })

  test("rejects response with summary too short", () => {
    const bad = {
      industry: "AI/ML",
      business_model: "B2B",
      summary: "Short",
      use_case: "This is a valid use case description.",
    }
    expect(() => decode(bad)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// analyzeCompany with mocked Anthropic client
// ---------------------------------------------------------------------------
describe("analyzeCompany", () => {
  const validAnalysis = {
    industry: "Developer Tools",
    business_model: "SaaS",
    summary:
      "Provides a cloud deployment platform for frontend applications.",
    use_case:
      "A development team could deploy and preview pull requests automatically.",
  }

  const createMockClient = (responseText: string) =>
    ({
      messages: {
        create: async () => ({
          content: [{ type: "text" as const, text: responseText }],
        }),
      },
    }) as unknown as import("@anthropic-ai/sdk").default

  test("returns parsed analysis for valid JSON response", async () => {
    const mockClient = createMockClient(JSON.stringify(validAnalysis))
    const result = await Effect.runPromise(
      analyzeCompany(mockClient, {
        companyName: "Vercel",
        description: "Cloud platform for frontend developers",
        website: "https://vercel.com",
      }),
    )

    expect(result.analysis.industry).toBe("Developer Tools")
    expect(result.analysis.business_model).toBe("SaaS")
    expect(result.rawResponse).toBe(JSON.stringify(validAnalysis))
  })

  test("returns analysis with null description and website", async () => {
    const mockClient = createMockClient(JSON.stringify(validAnalysis))
    const result = await Effect.runPromise(
      analyzeCompany(mockClient, {
        companyName: "Unknown Co",
        description: null,
        website: null,
      }),
    )

    expect(result.analysis.industry).toBe("Developer Tools")
  })

  test("fails with AiAnalysisError for invalid JSON after retries", async () => {
    const mockClient = createMockClient("this is not json at all")
    const result = await Effect.runPromiseExit(
      analyzeCompany(mockClient, {
        companyName: "BadCo",
        description: "test",
        website: null,
      }),
    )

    // After 2 retries it should fail
    expect(result._tag).toBe("Failure")
  })

  test("fails with AiAnalysisError for malformed JSON fields after retries", async () => {
    // Valid JSON but wrong schema (invalid industry)
    const badPayload = JSON.stringify({
      industry: "NotAValidIndustry",
      business_model: "SaaS",
      summary: "A long enough summary for the schema check.",
      use_case: "A long enough use case for the schema check.",
    })
    const mockClient = createMockClient(badPayload)
    const result = await Effect.runPromiseExit(
      analyzeCompany(mockClient, {
        companyName: "BadFieldsCo",
        description: "test",
        website: null,
      }),
    )

    expect(result._tag).toBe("Failure")
  })

  test("fails when API call throws", async () => {
    const errorClient = {
      messages: {
        create: async () => {
          throw new Error("API rate limited")
        },
      },
    } as unknown as import("@anthropic-ai/sdk").default

    const result = await Effect.runPromiseExit(
      analyzeCompany(errorClient, {
        companyName: "ErrorCo",
        description: "test",
        website: null,
      }),
    )

    expect(result._tag).toBe("Failure")
  })

  test("handles empty content array from API", async () => {
    const emptyClient = {
      messages: {
        create: async () => ({
          content: [],
        }),
      },
    } as unknown as import("@anthropic-ai/sdk").default

    const result = await Effect.runPromiseExit(
      analyzeCompany(emptyClient, {
        companyName: "EmptyCo",
        description: "test",
        website: null,
      }),
    )

    // Empty text "" is not valid JSON, so should fail after retries
    expect(result._tag).toBe("Failure")
  })
})
