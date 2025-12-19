import { 
  type User, type UpsertUser,
  type ContentStrategy, type InsertContentStrategy,
  type ArchetypeResult, type InsertArchetypeResult,
  type VoicePost, type InsertVoicePost,
  type CaseStudy, type InsertCaseStudy,
  type SalesTrainerSample, type InsertSalesTrainerSample,
  type SalesTrainerSession, type InsertSalesTrainerSession,
  users, contentStrategies, archetypeResults, voicePosts, caseStudies,
  salesTrainerSamples, salesTrainerSessions
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, and } from "drizzle-orm";

export interface IStorage {
  // Users (for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  
  // Content Strategies
  getContentStrategies(userId: string): Promise<ContentStrategy[]>;
  getContentStrategy(id: string, userId: string): Promise<ContentStrategy | undefined>;
  createContentStrategy(strategy: InsertContentStrategy): Promise<ContentStrategy>;
  deleteContentStrategy(id: string, userId: string): Promise<void>;
  
  // Archetype Results
  getArchetypeResults(userId: string): Promise<ArchetypeResult[]>;
  getLatestArchetypeResult(userId: string): Promise<ArchetypeResult | undefined>;
  createArchetypeResult(result: InsertArchetypeResult): Promise<ArchetypeResult>;
  
  // Voice Posts
  getVoicePosts(userId: string): Promise<VoicePost[]>;
  createVoicePost(post: InsertVoicePost): Promise<VoicePost>;
  deleteVoicePost(id: string, userId: string): Promise<void>;
  
  // Case Studies
  getCaseStudies(userId: string): Promise<CaseStudy[]>;
  getCaseStudy(id: string, userId: string): Promise<CaseStudy | undefined>;
  createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy>;
  searchCaseStudies(query: string, userId: string): Promise<CaseStudy[]>;
  deleteCaseStudy(id: string, userId: string): Promise<void>;
  
  // Admin
  getAllUsers(): Promise<User[]>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalStrategies: number;
    totalVoicePosts: number;
    totalCaseStudies: number;
    subscriptionBreakdown: { free: number; standard: number; pro: number };
  }>;
  
  // Generation limits
  canGenerateStrategy(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }>;
  incrementDailyGeneration(userId: string): Promise<void>;
  
  // Sales Trainer (Money Trainer)
  getSalesTrainerSamples(): Promise<SalesTrainerSample[]>;
  getSalesTrainerSamplesByPainType(painType: string): Promise<SalesTrainerSample[]>;
  createSalesTrainerSample(sample: InsertSalesTrainerSample): Promise<SalesTrainerSample>;
  getSalesTrainerSessions(userId: string): Promise<SalesTrainerSession[]>;
  createSalesTrainerSession(session: InsertSalesTrainerSession): Promise<SalesTrainerSession>;
}

export class DatabaseStorage implements IStorage {
  // Users (for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Content Strategies
  async getContentStrategies(userId: string): Promise<ContentStrategy[]> {
    return db.select().from(contentStrategies)
      .where(eq(contentStrategies.userId, userId))
      .orderBy(desc(contentStrategies.createdAt));
  }

  async getContentStrategy(id: string, userId: string): Promise<ContentStrategy | undefined> {
    const [strategy] = await db.select().from(contentStrategies)
      .where(and(eq(contentStrategies.id, id), eq(contentStrategies.userId, userId)));
    return strategy;
  }

  async createContentStrategy(strategy: InsertContentStrategy): Promise<ContentStrategy> {
    const [created] = await db.insert(contentStrategies).values(strategy).returning();
    return created;
  }

  async deleteContentStrategy(id: string, userId: string): Promise<void> {
    await db.delete(contentStrategies).where(
      and(eq(contentStrategies.id, id), eq(contentStrategies.userId, userId))
    );
  }

  // Archetype Results
  async getArchetypeResults(userId: string): Promise<ArchetypeResult[]> {
    return db.select().from(archetypeResults)
      .where(eq(archetypeResults.userId, userId))
      .orderBy(desc(archetypeResults.createdAt));
  }

  async getLatestArchetypeResult(userId: string): Promise<ArchetypeResult | undefined> {
    const [result] = await db.select().from(archetypeResults)
      .where(eq(archetypeResults.userId, userId))
      .orderBy(desc(archetypeResults.createdAt))
      .limit(1);
    return result;
  }

  async createArchetypeResult(result: InsertArchetypeResult): Promise<ArchetypeResult> {
    const [created] = await db.insert(archetypeResults).values(result).returning();
    return created;
  }

  // Voice Posts
  async getVoicePosts(userId: string): Promise<VoicePost[]> {
    return db.select().from(voicePosts)
      .where(eq(voicePosts.userId, userId))
      .orderBy(desc(voicePosts.createdAt));
  }

  async createVoicePost(post: InsertVoicePost): Promise<VoicePost> {
    const [created] = await db.insert(voicePosts).values(post).returning();
    return created;
  }

  async deleteVoicePost(id: string, userId: string): Promise<void> {
    await db.delete(voicePosts).where(
      and(eq(voicePosts.id, id), eq(voicePosts.userId, userId))
    );
  }

  // Case Studies
  async getCaseStudies(userId: string): Promise<CaseStudy[]> {
    return db.select().from(caseStudies)
      .where(eq(caseStudies.userId, userId))
      .orderBy(desc(caseStudies.createdAt));
  }

  async getCaseStudy(id: string, userId: string): Promise<CaseStudy | undefined> {
    const [caseStudy] = await db.select().from(caseStudies)
      .where(and(eq(caseStudies.id, id), eq(caseStudies.userId, userId)));
    return caseStudy;
  }

  async createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy> {
    const [created] = await db.insert(caseStudies).values(caseStudy).returning();
    return created;
  }

  async searchCaseStudies(query: string, userId: string): Promise<CaseStudy[]> {
    const searchCondition = or(
      ilike(caseStudies.reviewText, `%${query}%`),
      ilike(caseStudies.generatedQuote, `%${query}%`),
      ilike(caseStudies.generatedBody, `%${query}%`)
    );
    
    return db.select().from(caseStudies)
      .where(and(eq(caseStudies.userId, userId), searchCondition))
      .orderBy(desc(caseStudies.createdAt));
  }

  async deleteCaseStudy(id: string, userId: string): Promise<void> {
    await db.delete(caseStudies).where(
      and(eq(caseStudies.id, id), eq(caseStudies.userId, userId))
    );
  }

  // Admin Methods
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalStrategies: number;
    totalVoicePosts: number;
    totalCaseStudies: number;
    subscriptionBreakdown: { free: number; standard: number; pro: number };
  }> {
    const allUsers = await db.select().from(users);
    const allStrategies = await db.select().from(contentStrategies);
    const allVoicePosts = await db.select().from(voicePosts);
    const allCaseStudies = await db.select().from(caseStudies);

    const subscriptionBreakdown = {
      free: allUsers.filter(u => !u.subscriptionTier || u.subscriptionTier === "free").length,
      standard: allUsers.filter(u => u.subscriptionTier === "standard").length,
      pro: allUsers.filter(u => u.subscriptionTier === "pro").length,
    };

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.length,
      totalStrategies: allStrategies.length,
      totalVoicePosts: allVoicePosts.length,
      totalCaseStudies: allCaseStudies.length,
      subscriptionBreakdown,
    };
  }

  // Generation Limits
  async canGenerateStrategy(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { allowed: false, reason: "Пользователь не найден" };
    }

    // PRO users (standard or pro tier) have unlimited generations
    if (user.subscriptionTier === "standard" || user.subscriptionTier === "pro") {
      return { allowed: true, remaining: -1 };
    }

    // Free users: 1 generation per day
    const today = new Date().toISOString().split("T")[0];
    const dailyUsed = user.lastGenerationDate === today ? (user.dailyGenerationsUsed || 0) : 0;
    const dailyLimit = 1;

    if (dailyUsed >= dailyLimit) {
      return { 
        allowed: false, 
        reason: "Достигнут дневной лимит. Бесплатный тариф позволяет 1 генерацию в сутки. Перейдите на PRO для безлимитного доступа.",
        remaining: 0
      };
    }

    return { allowed: true, remaining: dailyLimit - dailyUsed };
  }

  async incrementDailyGeneration(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const isNewDay = user.lastGenerationDate !== today;

    await db.update(users).set({
      dailyGenerationsUsed: isNewDay ? 1 : (user.dailyGenerationsUsed || 0) + 1,
      lastGenerationDate: today,
      generationsUsed: (user.generationsUsed || 0) + 1,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  }

  // Sales Trainer (Money Trainer) Methods
  async getSalesTrainerSamples(): Promise<SalesTrainerSample[]> {
    return db.select().from(salesTrainerSamples).orderBy(desc(salesTrainerSamples.createdAt));
  }

  async getSalesTrainerSamplesByPainType(painType: string): Promise<SalesTrainerSample[]> {
    return db.select().from(salesTrainerSamples)
      .where(eq(salesTrainerSamples.painType, painType))
      .orderBy(desc(salesTrainerSamples.createdAt))
      .limit(3);
  }

  async createSalesTrainerSample(sample: InsertSalesTrainerSample): Promise<SalesTrainerSample> {
    const [created] = await db.insert(salesTrainerSamples).values(sample).returning();
    return created;
  }

  async getSalesTrainerSessions(userId: string): Promise<SalesTrainerSession[]> {
    return db.select().from(salesTrainerSessions)
      .where(eq(salesTrainerSessions.userId, userId))
      .orderBy(desc(salesTrainerSessions.createdAt));
  }

  async createSalesTrainerSession(session: InsertSalesTrainerSession): Promise<SalesTrainerSession> {
    const [created] = await db.insert(salesTrainerSessions).values(session).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
