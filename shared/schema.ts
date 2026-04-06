import { sql } from "drizzle-orm";
import { text, varchar, integer, boolean, timestamp, jsonb, index, pgSchema } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const esotericSchema = pgSchema("esoteric_planner");

export const sessions = esotericSchema.table(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = esotericSchema.table("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  nickname: varchar("nickname"),
  emailVerifiedAt: timestamp("email_verified_at"),
  subscriptionTier: varchar("subscription_tier").default("trial"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  generationsUsed: integer("generations_used").default(0),
  generationsLimit: integer("generations_limit").default(0),
  dailyGenerationsUsed: integer("daily_generations_used").default(0),
  lastGenerationDate: varchar("last_generation_date"),
  lastLoginAt: timestamp("last_login_at"),
  isAdmin: boolean("is_admin").default(false),
  marketingConsent: boolean("marketing_consent").default(false),
  marketingConsentAt: timestamp("marketing_consent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passwordResetTokens = esotericSchema.table("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tokenHash: varchar("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export const promocodes = esotericSchema.table("promocodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").unique().notNull(),
  bonusDays: integer("bonus_days").notNull().default(30),
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  promocodeType: varchar("promocode_type").default("bonus"),
  discountPercent: integer("discount_percent"),
  discountPlanType: varchar("discount_plan_type"),
  bonusUntil: timestamp("bonus_until"),
});

export const promocodeUsages = esotericSchema.table("promocode_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promocodeId: varchar("promocode_id").references(() => promocodes.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  usedAt: timestamp("used_at").defaultNow(),
});

export type Promocode = typeof promocodes.$inferSelect;
export type InsertPromocode = typeof promocodes.$inferInsert;
export type PromocodeUsage = typeof promocodeUsages.$inferSelect;

export const payments = esotericSchema.table("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").notNull(),
  amount: varchar("amount").notNull(),
  planType: varchar("plan_type").notNull(),
  status: varchar("status").notNull().default("pending"),
  prodamusData: jsonb("prodamus_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const contentStrategies = esotericSchema.table("content_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  topic: text("topic").notNull(),
  goal: text("goal").notNull(),
  days: integer("days").notNull().default(7),
  posts: jsonb("posts").notNull().$type<ContentPost[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface FormatContent {
  content: string;
  hashtags?: string[];
}

export interface ContentPost {
  day: number;
  idea: string;
  type: string;
  post: FormatContent;
  carousel: FormatContent;
  reels: FormatContent;
  stories: FormatContent;
}

// Zod schemas for JSONB validation - flexible to match frontend payloads
const formatContentSchema = z.object({
  content: z.string(),
  hashtags: z.union([z.array(z.string()), z.string(), z.null()]).optional().transform(val => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) return val.split(',').map(s => s.trim());
    return [];
  }),
});

const contentPostSchema = z.object({
  day: z.number(),
  idea: z.string(),
  type: z.string(),
  post: formatContentSchema,
  carousel: formatContentSchema,
  reels: formatContentSchema,
  stories: formatContentSchema,
});

export const insertContentStrategySchema = createInsertSchema(contentStrategies, {
  posts: z.array(contentPostSchema),
  days: z.union([z.number(), z.string()]).transform(val => {
    if (typeof val === 'string') {
      if (val === 'today') return 1;
      return parseInt(val) || 7;
    }
    return val;
  }),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertContentStrategy = typeof contentStrategies.$inferInsert;
export type ContentStrategy = typeof contentStrategies.$inferSelect;

export const archetypeResults = esotericSchema.table("archetype_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  archetypeName: text("archetype_name").notNull(),
  archetypeDescription: text("archetype_description").notNull(),
  answers: jsonb("answers").notNull().$type<number[]>(),
  recommendations: jsonb("recommendations").notNull().$type<string[]>(),
  brandColors: jsonb("brand_colors").$type<string[]>(),
  brandFonts: jsonb("brand_fonts").$type<string[]>(),
  gender: varchar("gender").default("female"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertArchetypeResultSchema = createInsertSchema(archetypeResults, {
  answers: z.array(z.number()),
  recommendations: z.array(z.string()),
  brandColors: z.array(z.string()).optional().nullable(),
  brandFonts: z.array(z.string()).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertArchetypeResult = typeof archetypeResults.$inferInsert;
export type ArchetypeResult = typeof archetypeResults.$inferSelect;

export const voicePosts = esotericSchema.table("voice_posts", {
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

export type InsertVoicePost = typeof voicePosts.$inferInsert;
export type VoicePost = typeof voicePosts.$inferSelect;

export const caseStudies = esotericSchema.table("case_studies", {
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

export const insertCaseStudySchema = createInsertSchema(caseStudies, {
  tags: z.array(z.string()),
  generatedHeadlines: z.array(z.string()).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertCaseStudy = typeof caseStudies.$inferInsert;
export type CaseStudy = typeof caseStudies.$inferSelect;

export const salesTrainerSamples = esotericSchema.table("sales_trainer_samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientQuestion: text("client_question").notNull(),
  expertDraft: text("expert_draft"),
  improvedAnswer: text("improved_answer").notNull(),
  coachFeedback: text("coach_feedback"),
  painType: varchar("pain_type"),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalesTrainerSampleSchema = createInsertSchema(salesTrainerSamples, {
  tags: z.array(z.string()).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertSalesTrainerSample = typeof salesTrainerSamples.$inferInsert;
export type SalesTrainerSample = typeof salesTrainerSamples.$inferSelect;

export const salesTrainerSessions = esotericSchema.table("sales_trainer_sessions", {
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

export type InsertSalesTrainerSession = typeof salesTrainerSessions.$inferInsert;
export type SalesTrainerSession = typeof salesTrainerSessions.$inferSelect;

// Content Alchemy - Алхимия контента
export const contentAlchemyPlans = esotericSchema.table("content_alchemy_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  daysCount: integer("days_count").notNull(),
  contentType: varchar("content_type").notNull(), // продающий, экспертный, прогревающий
  warmupTarget: text("warmup_target").notNull(), // к чему греем
  topics: jsonb("topics").notNull().$type<AlchemyTopic[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface AlchemyTopic {
  day: number;
  topic: string;
  description: string;
}

export const insertContentAlchemyPlanSchema = createInsertSchema(contentAlchemyPlans, {
  topics: z.array(z.object({
    day: z.number(),
    topic: z.string(),
    description: z.string(),
  })),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertContentAlchemyPlan = typeof contentAlchemyPlans.$inferInsert;
export type ContentAlchemyPlan = typeof contentAlchemyPlans.$inferSelect;

// Grimoire Topics - Темы в гримуаре
export const grimoireTopics = esotericSchema.table("grimoire_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  planId: varchar("plan_id").references(() => contentAlchemyPlans.id),
  day: integer("day").notNull(),
  topic: text("topic").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("new"), // new, in_progress, completed
  questions: jsonb("questions").$type<string[]>(),
  answers: jsonb("answers").$type<GrimoireAnswer[]>(),
  generatedPost: text("generated_post"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface GrimoireAnswer {
  question: string;
  answer: string;
}

export const insertGrimoireTopicSchema = createInsertSchema(grimoireTopics, {
  questions: z.array(z.string()).optional().nullable(),
  answers: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGrimoireTopic = typeof grimoireTopics.$inferInsert;
export type GrimoireTopic = typeof grimoireTopics.$inferSelect;

export const usageEvents = esotericSchema.table("usage_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  section: varchar("section").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UsageEvent = typeof usageEvents.$inferSelect;
export type InsertUsageEvent = typeof usageEvents.$inferInsert;

export const consentLogs = esotericSchema.table("consent_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  consentType: varchar("consent_type").notNull(),
  granted: boolean("granted").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  documentVersion: varchar("document_version"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ConsentLog = typeof consentLogs.$inferSelect;
export type InsertConsentLog = typeof consentLogs.$inferInsert;
