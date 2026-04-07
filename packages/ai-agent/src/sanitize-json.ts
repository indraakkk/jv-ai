/**
 * Strips markdown code fences and surrounding text from LLM output
 * so that `JSON.parse` receives only the raw JSON object/array.
 */
export const sanitizeJsonResponse = (raw: string): string => {
  let text = raw.trim()

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
  if (fenceMatch?.[1]) {
    text = fenceMatch[1].trim()
  }

  // Strip any leading text before the first { or [
  const firstBrace = text.indexOf("{")
  const firstBracket = text.indexOf("[")
  const starts = [firstBrace, firstBracket].filter((i) => i >= 0)
  if (starts.length > 0) {
    const start = Math.min(...starts)
    if (start > 0) text = text.slice(start)
  }

  // Strip any trailing text after the last } or ]
  const lastBrace = text.lastIndexOf("}")
  const lastBracket = text.lastIndexOf("]")
  const ends = [lastBrace, lastBracket].filter((i) => i >= 0)
  if (ends.length > 0) {
    const end = Math.max(...ends)
    if (end < text.length - 1) text = text.slice(0, end + 1)
  }

  return text
}
