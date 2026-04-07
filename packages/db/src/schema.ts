import { pgTable, uuid, text, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core"

export const industryEnum = pgEnum("industry", [
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
])

export const businessModelEnum = pgEnum("business_model", [
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
])

export const analysisStatusEnum = pgEnum("analysis_status", [
  "pending",
  "analyzing",
  "completed",
  "failed",
])

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().$defaultFn(() => Bun.randomUUIDv7()),
  companyName: text("company_name").notNull(),
  description: text("description"),
  website: text("website"),
  industry: industryEnum("industry"),
  businessModel: businessModelEnum("business_model"),
  summary: text("summary"),
  useCase: text("use_case"),
  analysisStatus: analysisStatusEnum("analysis_status").notNull().default("pending"),
  rawAiResponse: text("raw_ai_response"),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("companies_company_name_unique").on(table.companyName),
])

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
