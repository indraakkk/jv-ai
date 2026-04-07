export const RESEARCH_SYSTEM_PROMPT = `You are a startup research assistant. Your job is to enrich sparse company data.
Given a company name and whatever partial information is available, produce a comprehensive description.
Respond with a valid JSON object. No markdown, no code fences — just the raw JSON object.`

export const buildResearchUserPrompt = (input: {
  companyName: string
  description: string | null
  website: string | null
}): string => {
  const parts = [`Company Name: ${input.companyName}`]
  if (input.website) parts.push(`Website: ${input.website}`)
  if (input.description) parts.push(`Existing Description: ${input.description}`)

  return `${parts.join("\n")}

Based on what you know about this company, provide an enriched description.

Respond with a JSON object containing:
- "description": A comprehensive 2-3 sentence description of what this company does, its products, and its market position.
- "website": The company's website URL (use the provided one if available, or your best knowledge).

Example:
{"description":"Vercel provides a cloud platform for frontend developers, enabling instant deployments and serverless functions. Built the Next.js framework and pioneered edge computing for web applications.","website":"https://vercel.com"}`
}
