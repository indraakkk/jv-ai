import { describe, expect, test } from "bun:test"
import { sanitizeJsonResponse } from "../sanitize-json"

describe("sanitizeJsonResponse", () => {
  test("passes through clean JSON object", () => {
    const json = '{"key":"value"}'
    expect(sanitizeJsonResponse(json)).toBe(json)
  })

  test("passes through clean JSON array", () => {
    const json = '[{"key":"value"}]'
    expect(sanitizeJsonResponse(json)).toBe(json)
  })

  test("strips ```json fences", () => {
    const input = '```json\n{"key":"value"}\n```'
    expect(sanitizeJsonResponse(input)).toBe('{"key":"value"}')
  })

  test("strips ``` fences without language tag", () => {
    const input = '```\n{"key":"value"}\n```'
    expect(sanitizeJsonResponse(input)).toBe('{"key":"value"}')
  })

  test("strips leading text before JSON", () => {
    const input = 'Here is the JSON:\n{"key":"value"}'
    expect(sanitizeJsonResponse(input)).toBe('{"key":"value"}')
  })

  test("strips trailing text after JSON", () => {
    const input = '{"key":"value"}\nI hope this helps!'
    expect(sanitizeJsonResponse(input)).toBe('{"key":"value"}')
  })

  test("strips both leading and trailing text", () => {
    const input = 'Sure! Here you go:\n{"key":"value"}\nLet me know if you need more.'
    expect(sanitizeJsonResponse(input)).toBe('{"key":"value"}')
  })

  test("handles empty string", () => {
    expect(sanitizeJsonResponse("")).toBe("")
  })

  test("handles whitespace-only string", () => {
    expect(sanitizeJsonResponse("   \n  ")).toBe("")
  })

  test("preserves nested JSON structure", () => {
    const json = '{"outer":{"inner":"value"},"arr":[1,2,3]}'
    expect(sanitizeJsonResponse(`Some text\n${json}\nMore text`)).toBe(json)
  })
})
