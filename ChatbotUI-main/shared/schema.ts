import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  nickname: varchar("nickname"),
  subscriptionTier: varchar("subscription_tier").default("free"),
  generationsUsed: integer("generations_used").default(0),
  generationsLimit: integer("generations_limit").default(50),
  dailyGenerationsUsed: integer("daily_generations_used").default(0),
  lastGenerationDate: varchar("last_generation_date"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Content Strategies
export const contentStrategies = pgTable("content_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  topic: text("topic").notNull(),
  goal: text("goal").notNull(),
  days: integer("days").notNull().default(7),
  posts: jsonb("posts").notNull().$type<ContentPost[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface ContentPost {
  day: number;
  topic: string;
  hook: string;
  cta: string;
  hashtags: string[];
}

export const insertContentStrategySchema = createInsertSchema(contentStrategies).omit({
  id: true,
  createdAt: true,
});

export type InsertContentStrategy = z.infer<typeof insertContentStrategySchema>;
export type ContentStrategy = typeof contentStrategies.$inferSelect;

// Archetype Results
export const archetypeResults = pgTable("archetype_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  archetypeName: text("archetype_name").notNull(),
  archetypeDescription: text("archetype_description").notNull(),
  answers: jsonb("answers").notNull().$type<number[]>(),
  recommendations: jsonb("recommendations").notNull().$type<string[]>(),
  brandColors: jsonb("brand_colors").$type<string[]>(),
  brandFonts: jsonb("brand_fonts").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertArchetypeResultSchema = createInsertSchema(archetypeResults).omit({
  id: true,
  createdAt: true,
});

export type InsertArchetypeResult = z.infer<typeof insertArchetypeResultSchema>;
export type ArchetypeResult = typeof archetypeResults.$inferSelect;

// Voice Posts
export const voicePosts = pgTable("voice_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  originalText: text("original_text").notNull(),
  refinedText: text("refined_text").notNull(),
  tone: text("tone").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoicePostSchema = createInsertSchema(voicePosts).omit({
  id: true,
  createdAt: true,
});

export type InsertVoicePost = z.infer<typeof insertVoicePostSchema>;
export type VoicePost = typeof voicePosts.$inferSelect;

// Case Studies
export const caseStudies = pgTable("case_studies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  reviewText: text("review_text").notNull(),
  before: text("before"),
  action: text("action"),
  after: text("after"),
  tags: jsonb("tags").notNull().$type<string[]>(),
  generatedHeadlines: jsonb("generated_headlines").$type<string[]>(),
  generatedQuote: text("generated_quote"),
  generatedBody: text("generated_body"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({
  id: true,
  createdAt: true,
});

export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;
export type CaseStudy = typeof caseStudies.$inferSelect;

// Money Trainer - Training Samples (примеры для обучения AI)
export const salesTrainerSamples = pgTable("sales_trainer_samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientQuestion: text("client_question").notNull(),
  expertDraft: text("expert_draft"),
  improvedAnswer: text("improved_answer").notNull(),
  coachFeedback: text("coach_feedback"),
  painType: varchar("pain_type"), // relationships, career, money, health, etc.
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalesTrainerSampleSchema = createInsertSchema(salesTrainerSamples).omit({
  id: true,
  createdAt: true,
});

export type InsertSalesTrainerSample = z.infer<typeof insertSalesTrainerSampleSchema>;
export type SalesTrainerSample = typeof salesTrainerSamples.$inferSelect;

// Money Trainer - User Sessions (история генераций пользователя)
export const salesTrainerSessions = pgTable("sales_trainer_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  clientQuestion: text("client_question").notNull(),
  expertDraft: text("expert_draft").notNull(),
  improvedAnswer: text("improved_answer").notNull(),
  painType: varchar("pain_type"),
  offerType: varchar("offer_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalesTrainerSessionSchema = createInsertSchema(salesTrainerSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertSalesTrainerSession = z.infer<typeof insertSalesTrainerSessionSchema>;
export type SalesTrainerSession = typeof salesTrainerSessions.$inferSelect;
