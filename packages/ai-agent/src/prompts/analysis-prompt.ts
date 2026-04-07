import { IndustryValues, BusinessModelValues } from "@jackson-ventures/shared"

export const ANALYSIS_SYSTEM_PROMPT = `You are a startup and company analyst. You analyze companies and produce structured assessments.
IMPORTANT: You MUST respond with ONLY a valid JSON object matching the exact schema provided. No markdown code fences, no explanatory text, no prefixes or suffixes — output the raw JSON object and nothing else.
If information is insufficient, make your best inference based on the company name and website, and note any uncertainty in the summary.`

export const buildAnalysisUserPrompt = (input: {
  companyName: string
  description: string | null
  website: string | null
}): string => {
  const desc = input.description ?? "No description available."
  const site = input.website ?? "No website available."

  return `Analyze the following company and produce a structured assessment.

Company Name: ${input.companyName}
Website: ${site}
Description: ${desc}

Respond with a JSON object containing exactly these fields:

- "industry": One of: ${IndustryValues.map((v) => `"${v}"`).join(", ")}
- "business_model": One of: ${BusinessModelValues.map((v) => `"${v}"`).join(", ")}
- "summary": A single concise sentence summarizing what the company does.
- "use_case": A specific potential use case or application for this company's product/service.

Example response format:
{"industry":"Developer Tools","business_model":"SaaS","summary":"Provides a cloud deployment platform for frontend applications.","use_case":"A development team could use this platform to deploy and preview pull requests automatically before merging."}`
}
