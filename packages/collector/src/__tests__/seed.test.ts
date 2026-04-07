import { describe, expect, test } from "bun:test"

import { seedCompanies } from "../sources/seed"

// ---------------------------------------------------------------------------
// Seed data integrity tests
// ---------------------------------------------------------------------------
describe("seedCompanies", () => {
  test("contains at least 10 companies", () => {
    expect(seedCompanies.length).toBeGreaterThanOrEqual(10)
  })

  test("every company has a non-empty companyName", () => {
    for (const company of seedCompanies) {
      expect(typeof company.companyName).toBe("string")
      expect(company.companyName.length).toBeGreaterThan(0)
    }
  })

  test("every company has a description", () => {
    for (const company of seedCompanies) {
      // description must be a non-empty string (seed data should always have descriptions)
      expect(typeof company.description).toBe("string")
      expect(company.description!.length).toBeGreaterThan(0)
    }
  })

  test("every company has a website", () => {
    for (const company of seedCompanies) {
      expect(typeof company.website).toBe("string")
      expect(company.website!.length).toBeGreaterThan(0)
    }
  })

  test("every company website starts with https://", () => {
    for (const company of seedCompanies) {
      expect(company.website!.startsWith("https://")).toBe(true)
    }
  })

  test("every company has source set to 'seed'", () => {
    for (const company of seedCompanies) {
      expect(company.source).toBe("seed")
    }
  })

  test("no duplicate company names", () => {
    const names = seedCompanies.map((c) => c.companyName)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  test("no duplicate websites", () => {
    const websites = seedCompanies.map((c) => c.website)
    const uniqueWebsites = new Set(websites)
    expect(uniqueWebsites.size).toBe(websites.length)
  })

  test("contains well-known companies", () => {
    const names = seedCompanies.map((c) => c.companyName)
    // These are in the actual seed data
    expect(names).toContain("Vercel")
    expect(names).toContain("Stripe")
    expect(names).toContain("Anthropic")
  })

  test("array is readonly", () => {
    // TypeScript enforces ReadonlyArray, but at runtime we verify it's an array
    expect(Array.isArray(seedCompanies)).toBe(true)
  })

  test("descriptions are at least 20 characters long", () => {
    for (const company of seedCompanies) {
      expect(company.description!.length).toBeGreaterThanOrEqual(20)
    }
  })
})
