CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'analyzing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."business_model" AS ENUM('B2B', 'B2C', 'B2B2C', 'SaaS', 'Marketplace', 'Open Source', 'Freemium', 'Enterprise', 'API/Platform', 'Other');--> statement-breakpoint
CREATE TYPE "public"."industry" AS ENUM('FinTech', 'HealthTech', 'Developer Tools', 'AI/ML', 'E-Commerce', 'EdTech', 'CleanTech', 'Cybersecurity', 'SaaS Infrastructure', 'Marketplace', 'Other');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"description" text,
	"website" text,
	"industry" "industry",
	"business_model" "business_model",
	"summary" text,
	"use_case" text,
	"analysis_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"raw_ai_response" text,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
