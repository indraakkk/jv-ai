import { Schema } from "effect"

export const IndustryValues = [
  "FinTech",
  "HealthTech",
  "Developer Tools",
  "AI/ML",
  "E-Commerce",
  "EdTech",
  "CleanTech",
  "Cybersecurity",
  "SaaS Infrastructure",
  "Marketplace",
  "Other",
] as const

export const BusinessModelValues = [
  "B2B",
  "B2C",
  "B2B2C",
  "SaaS",
  "Marketplace",
  "Open Source",
  "Freemium",
  "Enterprise",
  "API/Platform",
  "Other",
] as const

export const AnalysisStatusValues = [
  "pending",
  "analyzing",
  "completed",
  "failed",
] as const

export type Industry = (typeof IndustryValues)[number]
export type BusinessModel = (typeof BusinessModelValues)[number]
export type AnalysisStatus = (typeof AnalysisStatusValues)[number]

export const RawCompanyInput = Schema.Struct({
  companyName: Schema.String,
  website: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  source: Schema.optional(Schema.String),
})
export type RawCompanyInput = typeof RawCompanyInput.Type

export const AiAnalysisOutput = Schema.Struct({
  industry: Schema.Literal(...IndustryValues),
  business_model: Schema.Literal(...BusinessModelValues),
  summary: Schema.String.pipe(Schema.minLength(10)),
  use_case: Schema.String.pipe(Schema.minLength(10)),
})
export type AiAnalysisOutput = typeof AiAnalysisOutput.Type

export const CompanyRecord = Schema.Struct({
  id: Schema.String,
  companyName: Schema.String,
  description: Schema.NullOr(Schema.String),
  website: Schema.NullOr(Schema.String),
  industry: Schema.NullOr(Schema.String),
  businessModel: Schema.NullOr(Schema.String),
  summary: Schema.NullOr(Schema.String),
  useCase: Schema.NullOr(Schema.String),
  analysisStatus: Schema.Literal(...AnalysisStatusValues),
  source: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
})
export type CompanyRecord = typeof CompanyRecord.Type

export const CompanyListItem = Schema.Struct({
  id: Schema.String,
  companyName: Schema.String,
  industry: Schema.NullOr(Schema.String),
  businessModel: Schema.NullOr(Schema.String),
  summary: Schema.NullOr(Schema.String),
  analysisStatus: Schema.String,
})
export type CompanyListItem = typeof CompanyListItem.Type

export const CompanyDetail = CompanyRecord
export type CompanyDetail = CompanyRecord
