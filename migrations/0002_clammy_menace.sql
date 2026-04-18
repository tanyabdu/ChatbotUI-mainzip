CREATE TABLE "esoteric_planner"."newsletter_log_recipients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"status" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "esoteric_planner"."newsletter_log_recipients" ADD CONSTRAINT "newsletter_log_recipients_log_id_newsletter_logs_id_fk" FOREIGN KEY ("log_id") REFERENCES "esoteric_planner"."newsletter_logs"("id") ON DELETE cascade ON UPDATE no action;