CREATE TABLE "esoteric_planner"."consent_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"consent_type" varchar NOT NULL,
	"granted" boolean NOT NULL,
	"ip_address" varchar,
	"user_agent" text,
	"document_version" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."newsletter_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"segment" varchar NOT NULL,
	"marketing_only" boolean DEFAULT true NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."usage_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"section" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "esoteric_planner"."promocodes" ADD COLUMN "promocode_type" varchar DEFAULT 'bonus';--> statement-breakpoint
ALTER TABLE "esoteric_planner"."promocodes" ADD COLUMN "discount_percent" integer;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."promocodes" ADD COLUMN "discount_plan_type" varchar;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."promocodes" ADD COLUMN "bonus_until" timestamp;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."users" ADD COLUMN "marketing_consent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."users" ADD COLUMN "marketing_consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."consent_logs" ADD CONSTRAINT "consent_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;