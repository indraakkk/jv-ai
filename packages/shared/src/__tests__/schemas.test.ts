import { describe, expect, test } from "bun:test"

import { Effect, pipe, Schema } from "effect"

import {
  AiAnalysisOutput,
  AnalysisStatusValues,
  BusinessModelValues,
  CompanyListItem,
  CompanyRecord,
  IndustryValues,
  RawCompanyInput,
} from "../schemas"

// ---------------------------------------------------------------------------
// RawCompanyInput
// ---------------------------------------------------------------------------
describe("RawCompanyInput", () => {
  const decode = Schema.decodeUnknownSync(RawCompanyInput)

  test("decodes a valid full input", () => {
    const input = {
      companyName: "Acme Corp",
      website: "https://acme.com",
      description: "Widgets for the modern age",
      source: "seed",
    }
    const result = decode(input)
    expect(result.companyName).toBe("Acme Corp")
    expect(result.website).toBe("https://acme.com")
    expect(result.description).toBe("Widgets for the modern age")
    expect(result.source).toBe("seed")
  })

  test("decodes with null website and description", () => {
    const input = {
      companyName: "NullCo",
      website: null,
      description: null,
    }
    const result = decode(input)
    expect(result.companyName).toBe("NullCo")
    expect(result.website).toBeNull()
    expect(result.description).toBeNull()
  })

  test("decodes without optional source field", () => {
    const input = {
      companyName: "NoSource",
      website: "https://nosource.com",
      description: "No source provided",
    }
    const result = decode(input)
    expect(result.companyName).toBe("NoSource")
    expect(result.source).toBeUndefined()
  })

  test("rejects missing companyName", () => {
    const input = {
      website: "https://example.com",
      description: "Missing name",
    }
    expect(() => decode(input)).toThrow()
  })

  test("rejects non-string companyName", () => {
    const input = {
      companyName: 123,
      website: null,
      description: null,
    }
    expect(() => decode(input)).toThrow()
  })

  test("rejects missing website field entirely", () => {
    const input = {
      companyName: "MissingWebsite",
      description: "test",
    }
    // website is required (NullOr means it must be present, but can be null)
    expect(() => decode(input)).toThrow()
  })

  test("rejects missing description field entirely", () => {
    const input = {
      companyName: "MissingDesc",
      website: "https://test.com",
    }
    expect(() => decode(input)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// AiAnalysisOutput
// ---------------------------------------------------------------------------
describe("AiAnalysisOutput", () => {
  const decode = Schema.decodeUnknownSync(AiAnalysisOutput)

  const validOutput = {
    industry: "FinTech" as const,
    business_model: "SaaS" as const,
    summary: "A platform that provides financial tooling for modern banks.",
    use_case:
      "Banks can integrate this to offer real-time payment notifications.",
  }

  test("decodes a valid AI analysis output", () => {
    const result = decode(validOutput)
    expect(result.industry).toBe("FinTech")
    expect(result.business_model).toBe("SaaS")
    expect(result.summary).toBe(validOutput.summary)
    expect(result.use_case).toBe(validOutput.use_case)
  })

  test("accepts all valid industry values", () => {
    for (const industry of IndustryValues) {
      const input = { ...validOutput, industry }
      expect(() => decode(input)).not.toThrow()
    }
  })

  test("accepts all valid business model values", () => {
    for (const bm of BusinessModelValues) {
      const input = { ...validOutput, business_model: bm }
      expect(() => decode(input)).not.toThrow()
    }
  })

  test("rejects invalid industry value", () => {
    const input = { ...validOutput, industry: "InvalidIndustry" }
    expect(() => decode(input)).toThrow()
  })

  test("rejects invalid business_model value", () => {
    const input = { ...validOutput, business_model: "InvalidModel" }
    expect(() => decode(input)).toThrow()
  })

  test("rejects summary shorter than 10 characters", () => {
    const input = { ...validOutput, summary: "Short" }
    expect(() => decode(input)).toThrow()
  })

  test("rejects use_case shorter than 10 characters", () => {
    const input = { ...validOutput, use_case: "Tiny" }
    expect(() => decode(input)).toThrow()
  })

  test("rejects empty string summary", () => {
    const input = { ...validOutput, summary: "" }
    expect(() => decode(input)).toThrow()
  })

  test("rejects empty string use_case", () => {
    const input = { ...validOutput, use_case: "" }
    expect(() => decode(input)).toThrow()
  })

  test("rejects missing fields", () => {
    expect(() => decode({})).toThrow()
    expect(() => decode({ industry: "FinTech" })).toThrow()
    expect(() =>
      decode({ industry: "FinTech", business_model: "SaaS" }),
    ).toThrow()
  })

  test("rejects null industry", () => {
    const input = { ...validOutput, industry: null }
    expect(() => decode(input)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// CompanyRecord
// ---------------------------------------------------------------------------
describe("CompanyRecord", () => {
  const decode = Schema.decodeUnknownSync(CompanyRecord)

  const now = new Date()
  const validRecord = {
    id: "abc-123",
    companyName: "TestCo",
    description: null,
    website: null,
    industry: null,
    businessModel: null,
    summary: null,
    useCase: null,
    analysisStatus: "pending" as const,
    source: null,
    createdAt: now,
    updatedAt: now,
  }

  test("decodes a valid company record", () => {
    const result = decode(validRecord)
    expect(result.id).toBe("abc-123")
    expect(result.companyName).toBe("TestCo")
    expect(result.analysisStatus).toBe("pending")
  })

  test("accepts all analysis status values", () => {
    for (const status of AnalysisStatusValues) {
      const input = { ...validRecord, analysisStatus: status }
      expect(() => decode(input)).not.toThrow()
    }
  })

  test("rejects invalid analysis status", () => {
    const input = { ...validRecord, analysisStatus: "unknown" }
    expect(() => decode(input)).toThrow()
  })

  test("rejects missing id", () => {
    const { id: _, ...rest } = validRecord
    expect(() => decode(rest)).toThrow()
  })

  test("decodes a fully populated record", () => {
    const full = {
      ...validRecord,
      description: "A great company",
      website: "https://testco.com",
      industry: "AI/ML",
      businessModel: "SaaS",
      summary: "Does AI things",
      useCase: "ML pipelines",
      source: "seed",
    }
    const result = decode(full)
    expect(result.industry).toBe("AI/ML")
    expect(result.businessModel).toBe("SaaS")
  })
})

// ---------------------------------------------------------------------------
// CompanyListItem
// ---------------------------------------------------------------------------
describe("CompanyListItem", () => {
  const decode = Schema.decodeUnknownSync(CompanyListItem)

  test("decodes a valid list item", () => {
    const input = {
      id: "item-1",
      companyName: "ListCo",
      industry: "SaaS Infrastructure",
      businessModel: "Enterprise",
      summary: "Enterprise SaaS tools",
      analysisStatus: "completed",
    }
    const result = decode(input)
    expect(result.id).toBe("item-1")
    expect(result.companyName).toBe("ListCo")
  })

  test("accepts null optional fields", () => {
    const input = {
      id: "item-2",
      companyName: "NullFields",
      industry: null,
      businessModel: null,
      summary: null,
      analysisStatus: "pending",
    }
    const result = decode(input)
    expect(result.industry).toBeNull()
    expect(result.businessModel).toBeNull()
    expect(result.summary).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Enum value arrays
// ---------------------------------------------------------------------------
describe("Enum value arrays", () => {
  test("IndustryValues contains expected entries", () => {
    expect(IndustryValues).toContain("FinTech")
    expect(IndustryValues).toContain("AI/ML")
    expect(IndustryValues).toContain("Other")
    expect(IndustryValues.length).toBeGreaterThanOrEqual(5)
  })

  test("BusinessModelValues contains expected entries", () => {
    expect(BusinessModelValues).toContain("B2B")
    expect(BusinessModelValues).toContain("SaaS")
    expect(BusinessModelValues).toContain("Other")
    expect(BusinessModelValues.length).toBeGreaterThanOrEqual(5)
  })

  test("AnalysisStatusValues has the four expected statuses", () => {
    expect(AnalysisStatusValues).toEqual([
      "pending",
      "analyzing",
      "completed",
      "failed",
    ])
  })
})
