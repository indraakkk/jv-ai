import { Brand } from "effect"

export type CompanyId = string & Brand.Brand<"CompanyId">
export const CompanyId = Brand.nominal<CompanyId>()
