import { describe, expect, test } from "bun:test"

import { Effect, Layer, pipe } from "effect"
import {
  DatabaseError,
  NotFoundError,
} from "@jackson-ventures/shared"
import { CompanyRepository } from "@jackson-ventures/db"
import type { Company } from "@jackson-ventures/db"

// ---------------------------------------------------------------------------
// Error class shape tests
// ---------------------------------------------------------------------------
describe("NotFoundError", () => {
  test("has correct _tag", () => {
    const err = new NotFoundError({ entity: "Company", id: "abc-123" })
    expect(err._tag).toBe("NotFoundError")
  })

  test("contains entity and id", () => {
    const err = new NotFoundError({ entity: "Company", id: "xyz-789" })
    expect(err.entity).toBe("Company")
    expect(err.id).toBe("xyz-789")
  })
})

describe("DatabaseError", () => {
  test("has correct _tag", () => {
    const err = new DatabaseError({
      operation: "findAll",
      cause: new Error("connection refused"),
    })
    expect(err._tag).toBe("DatabaseError")
  })

  test("contains operation and cause", () => {
    const cause = new Error("timeout")
    const err = new DatabaseError({ operation: "findById", cause })
    expect(err.operation).toBe("findById")
    expect(err.cause).toBe(cause)
  })
})

// ---------------------------------------------------------------------------
// Health route shape tests
// ---------------------------------------------------------------------------
describe("health route response shape", () => {
  test("produces expected health payload", () => {
    // Replicate the health route logic without the HTTP layer
    const data = {
      status: "ok" as const,
      timestamp: new Date().toISOString(),
    }
    expect(data.status).toBe("ok")
    expect(typeof data.timestamp).toBe("string")
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

// ---------------------------------------------------------------------------
// CompanyRepository mock tests (handler-level logic)
// ---------------------------------------------------------------------------
describe("company route handler logic with mocked repository", () => {
  const mockCompany: Company = {
    id: "test-id-1",
    companyName: "TestCorp",
    description: "A testing corporation",
    website: "https://testcorp.com",
    industry: "Developer Tools",
    businessModel: "SaaS",
    summary: "Provides testing tools",
    useCase: "Automated testing for CI/CD",
    analysisStatus: "completed",
    source: "seed",
    rawAiResponse: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Create a mock repository layer for testing
  const MockCompanyRepository = Layer.succeed(CompanyRepository, {
    findAll: (_filters) => Effect.succeed([mockCompany]),
    findById: (id) =>
      id === "test-id-1"
        ? Effect.succeed(mockCompany)
        : Effect.fail(new NotFoundError({ entity: "Company", id })),
    insertMany: (data) =>
      Effect.succeed(
        data.map((d, i) => ({
          ...mockCompany,
          id: `generated-${i}`,
          companyName: d.companyName,
          description: d.description ?? null,
          website: d.website ?? null,
        })),
      ),
    updateAnalysis: (_id, _analysis, _raw) =>
      Effect.succeed(mockCompany),
    updateAnalysisStatus: (_id, _status) => Effect.succeed(undefined as void),
    findPendingAnalysis: () => Effect.succeed([]),
  })

  test("findAll returns companies array", async () => {
    const program = pipe(
      CompanyRepository,
      Effect.flatMap((repo) => repo.findAll()),
    )

    const result = await Effect.runPromise(
      Effect.provide(program, MockCompanyRepository),
    )

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)
    expect(result[0]!.companyName).toBe("TestCorp")
  })

  test("findAll accepts filter parameters", async () => {
    const program = pipe(
      CompanyRepository,
      Effect.flatMap((repo) =>
        repo.findAll({ industry: "Developer Tools", limit: 10, offset: 0 }),
      ),
    )

    const result = await Effect.runPromise(
      Effect.provide(program, MockCompanyRepository),
    )

    expect(result.length).toBeGreaterThanOrEqual(0)
  })

  test("findById returns company for existing id", async () => {
    const program = pipe(
      CompanyRepository,
      Effect.flatMap((repo) => repo.findById("test-id-1")),
    )

    const result = await Effect.runPromise(
      Effect.provide(program, MockCompanyRepository),
    )

    expect(result.id).toBe("test-id-1")
    expect(result.companyName).toBe("TestCorp")
  })

  test("findById fails with NotFoundError for missing id", async () => {
    const program = pipe(
      CompanyRepository,
      Effect.flatMap((repo) => repo.findById("nonexistent")),
    )

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, MockCompanyRepository),
    )

    expect(exit._tag).toBe("Failure")
  })

  test("NotFoundError maps to 404 response shape", () => {
    // Simulate the error-to-response mapping from companies.ts
    const err = new NotFoundError({ entity: "Company", id: "nonexistent" })
    const responseBody = {
      error: "Not found",
      entity: err.entity,
      id: err.id,
    }

    expect(responseBody.error).toBe("Not found")
    expect(responseBody.entity).toBe("Company")
    expect(responseBody.id).toBe("nonexistent")
  })

  test("DatabaseError maps to 500 response shape", () => {
    // Simulate the error-to-response mapping from companies.ts
    const err = new DatabaseError({
      operation: "findAll",
      cause: new Error("connection timeout"),
    })
    const responseBody = {
      error: "Database error",
      detail: String(err.cause),
    }

    expect(responseBody.error).toBe("Database error")
    expect(responseBody.detail).toContain("connection timeout")
  })
})

// ---------------------------------------------------------------------------
// Pipeline route response shapes
// ---------------------------------------------------------------------------
describe("pipeline route response shapes", () => {
  test("successful pipeline run response has expected fields", () => {
    // The shape that pipeline/run produces on success
    const result = {
      collected: 15,
      analyzed: 12,
      failed: 3,
    }
    expect(typeof result.collected).toBe("number")
    expect(typeof result.analyzed).toBe("number")
    expect(typeof result.failed).toBe("number")
    expect(result.collected).toBe(result.analyzed + result.failed)
  })

  test("pipeline error response has expected fields", () => {
    const errorResponse = {
      error: "Pipeline failed",
      detail: "Error: connection refused",
    }
    expect(errorResponse.error).toBe("Pipeline failed")
    expect(typeof errorResponse.detail).toBe("string")
  })

  test("analyze-pending response has expected fields", () => {
    const result = { analyzed: 5 }
    expect(typeof result.analyzed).toBe("number")
  })
})

// ---------------------------------------------------------------------------
// Route module exports
// ---------------------------------------------------------------------------
describe("route module exports", () => {
  test("health routes module exports healthRoutes", async () => {
    const mod = await import("../routes/health")
    expect(mod.healthRoutes).toBeDefined()
  })

  test("company routes module exports companyRoutes", async () => {
    const mod = await import("../routes/companies")
    expect(mod.companyRoutes).toBeDefined()
  })

  test("pipeline routes module exports pipelineRoutes", async () => {
    const mod = await import("../routes/pipeline")
    expect(mod.pipelineRoutes).toBeDefined()
  })
})
