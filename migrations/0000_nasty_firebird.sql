-- CREATE SCHEMA "esoteric_planner";
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."archetype_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"archetype_name" text NOT NULL,
	"archetype_description" text NOT NULL,
	"answers" jsonb NOT NULL,
	"recommendations" jsonb NOT NULL,
	"brand_colors" jsonb,
	"brand_fonts" jsonb,
	"gender" varchar DEFAULT 'female',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."case_studies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"review_text" text NOT NULL,
	"before" text,
	"action" text,
	"after" text,
	"tags" jsonb NOT NULL,
	"generated_headlines" jsonb,
	"generated_quote" text,
	"generated_body" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."content_alchemy_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"days_count" integer NOT NULL,
	"content_type" varchar NOT NULL,
	"warmup_target" text NOT NULL,
	"topics" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."content_strategies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"topic" text NOT NULL,
	"goal" text NOT NULL,
	"days" integer DEFAULT 7 NOT NULL,
	"posts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."grimoire_topics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar,
	"day" integer NOT NULL,
	"topic" text NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'new' NOT NULL,
	"questions" jsonb,
	"answers" jsonb,
	"generated_post" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token_hash" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"order_id" varchar NOT NULL,
	"amount" varchar NOT NULL,
	"plan_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"prodamus_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."promocode_usages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promocode_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."promocodes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar NOT NULL,
	"bonus_days" integer DEFAULT 30 NOT NULL,
	"max_uses" integer DEFAULT 1,
	"used_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "promocodes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."sales_trainer_samples" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_question" text NOT NULL,
	"expert_draft" text,
	"improved_answer" text NOT NULL,
	"coach_feedback" text,
	"pain_type" varchar,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."sales_trainer_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"client_question" text NOT NULL,
	"expert_draft" text NOT NULL,
	"improved_answer" text NOT NULL,
	"pain_type" varchar,
	"offer_type" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"nickname" varchar,
	"email_verified_at" timestamp,
	"subscription_tier" varchar DEFAULT 'trial',
	"subscription_expires_at" timestamp,
	"trial_ends_at" timestamp,
	"generations_used" integer DEFAULT 0,
	"generations_limit" integer DEFAULT 0,
	"daily_generations_used" integer DEFAULT 0,
	"last_generation_date" varchar,
	"last_login_at" timestamp,
	"is_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "esoteric_planner"."voice_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"original_text" text NOT NULL,
	"refined_text" text NOT NULL,
	"tone" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "esoteric_planner"."archetype_results" ADD CONSTRAINT "archetype_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."case_studies" ADD CONSTRAINT "case_studies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."content_alchemy_plans" ADD CONSTRAINT "content_alchemy_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."content_strategies" ADD CONSTRAINT "content_strategies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."grimoire_topics" ADD CONSTRAINT "grimoire_topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."grimoire_topics" ADD CONSTRAINT "grimoire_topics_plan_id_content_alchemy_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "esoteric_planner"."content_alchemy_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."promocode_usages" ADD CONSTRAINT "promocode_usages_promocode_id_promocodes_id_fk" FOREIGN KEY ("promocode_id") REFERENCES "esoteric_planner"."promocodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."promocode_usages" ADD CONSTRAINT "promocode_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."sales_trainer_sessions" ADD CONSTRAINT "sales_trainer_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esoteric_planner"."voice_posts" ADD CONSTRAINT "voice_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "esoteric_planner"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "esoteric_planner"."sessions" USING btree ("expire");