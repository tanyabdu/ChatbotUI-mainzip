import { 
  type User, type UpsertUser,
  type ContentStrategy, type InsertContentStrategy,
  type ArchetypeResult, type InsertArchetypeResult,
  type VoicePost, type InsertVoicePost,
  type CaseStudy, type InsertCaseStudy,
  type SalesTrainerSample, type InsertSalesTrainerSample,
  type SalesTrainerSession, type InsertSalesTrainerSession,
  type PasswordResetToken, type InsertPasswordResetToken,
  type Promocode, type InsertPromocode,
  type Payment,
  users, contentStrategies, archetypeResults, voicePosts, caseStudies,
  salesTrainerSamples, salesTrainerSessions, passwordResetTokens,
  promocodes, promocodeUsages, payments
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, and, isNull, gt } from "drizzle-orm";

export interface IStorage {
  // Users (for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  
  // Access control
  hasActiveAccess(userId: string): Promise<{ hasAccess: boolean; reason?: string; daysLeft?: number }>;
  extendUserAccess(userId: string, days: number, tier?: string): Promise<User | undefined>;
  
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
  deleteUser(id: string): Promise<void>;
  getAdminStats(): Promise<{
    totalUsers: number;
    usersWithAccess: number;
    activeToday: number;
    activePaidSubscriptions: number;
    totalStrategies: number;
    totalVoicePosts: number;
    totalCaseStudies: number;
    subscriptionBreakdown: { trial: number; free: number; monthly: number; yearly: number };
    activeTrials: number;
    expiredTrials: number;
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
  
  // Payments
  recordPayment(data: { userId: string; orderId: string; amount: string; planType: string; status: string; prodamusData?: any }): Promise<Payment>;
  getPaymentHistory(userId: string): Promise<Payment[]>;
  getPaymentByOrderId(orderId: string): Promise<Payment | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
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

  // Password Reset Tokens
  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(data).returning();
    return token;
  }

  async getValidPasswordResetToken(userId: string): Promise<PasswordResetToken | undefined> {
    const now = new Date();
    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          gt(passwordResetTokens.expiresAt, now),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);
    return token;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  // Access control
  async hasActiveAccess(userId: string): Promise<{ hasAccess: boolean; reason?: string; daysLeft?: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { hasAccess: false, reason: "Пользователь не найден" };
    }

    // Admins always have access
    if (user.isAdmin) {
      return { hasAccess: true, daysLeft: -1 };
    }

    const now = new Date();

    // Check active subscription
    if (user.subscriptionTier === "monthly" || user.subscriptionTier === "yearly") {
      if (user.subscriptionExpiresAt && user.subscriptionExpiresAt > now) {
        const daysLeft = Math.ceil((user.subscriptionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { hasAccess: true, daysLeft };
      }
      // Subscription expired, check trial
    }

    // Check trial period
    if (user.trialEndsAt && user.trialEndsAt > now) {
      const daysLeft = Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { hasAccess: true, daysLeft };
    }

    return { 
      hasAccess: false, 
      reason: "Пробный период закончился. Оформите подписку для продолжения работы." 
    };
  }

  async extendUserAccess(userId: string, days: number, tier?: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Validate days is positive
    if (days <= 0) {
      throw new Error("Количество дней должно быть положительным");
    }

    const now = new Date();
    let newExpiresAt: Date;

    if (tier && (tier === "monthly" || tier === "yearly")) {
      // Extend/create subscription
      const currentExpires = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now 
        ? user.subscriptionExpiresAt 
        : now;
      newExpiresAt = new Date(currentExpires);
      newExpiresAt.setDate(newExpiresAt.getDate() + days);

      return this.updateUser(userId, {
        subscriptionTier: tier,
        subscriptionExpiresAt: newExpiresAt,
      });
    } else {
      // Extend trial
      const currentTrialEnds = user.trialEndsAt && user.trialEndsAt > now 
        ? user.trialEndsAt 
        : now;
      newExpiresAt = new Date(currentTrialEnds);
      newExpiresAt.setDate(newExpiresAt.getDate() + days);

      return this.updateUser(userId, {
        subscriptionTier: "trial",
        trialEndsAt: newExpiresAt,
      });
    }
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

  async deleteUser(id: string): Promise<void> {
    await db.delete(contentStrategies).where(eq(contentStrategies.userId, id));
    await db.delete(archetypeResults).where(eq(archetypeResults.userId, id));
    await db.delete(voicePosts).where(eq(voicePosts.userId, id));
    await db.delete(caseStudies).where(eq(caseStudies.userId, id));
    await db.delete(salesTrainerSessions).where(eq(salesTrainerSessions.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    usersWithAccess: number;
    activeToday: number;
    activePaidSubscriptions: number;
    totalStrategies: number;
    totalVoicePosts: number;
    totalCaseStudies: number;
    subscriptionBreakdown: { trial: number; free: number; monthly: number; yearly: number };
    activeTrials: number;
    expiredTrials: number;
  }> {
    const allUsers = await db.select().from(users);
    const allStrategies = await db.select().from(contentStrategies);
    const allVoicePosts = await db.select().from(voicePosts);
    const allCaseStudies = await db.select().from(caseStudies);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const subscriptionBreakdown = {
      trial: allUsers.filter(u => u.subscriptionTier === "trial").length,
      free: allUsers.filter(u => !u.subscriptionTier || u.subscriptionTier === "free").length,
      monthly: allUsers.filter(u => u.subscriptionTier === "monthly").length,
      yearly: allUsers.filter(u => u.subscriptionTier === "yearly").length,
    };
    
    const activeTrials = allUsers.filter(u => u.trialEndsAt && new Date(u.trialEndsAt) > now).length;
    const expiredTrials = allUsers.filter(u => u.trialEndsAt && new Date(u.trialEndsAt) <= now).length;
    
    const activeToday = allUsers.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) >= todayStart).length;
    
    const usersWithAccessSet = new Set<string>();
    
    allUsers.forEach(u => {
      if (u.isAdmin) {
        usersWithAccessSet.add(u.id);
      } else if (u.trialEndsAt && new Date(u.trialEndsAt) > now) {
        usersWithAccessSet.add(u.id);
      } else if (
        (u.subscriptionTier === "monthly" || u.subscriptionTier === "yearly") &&
        u.subscriptionExpiresAt &&
        new Date(u.subscriptionExpiresAt) > now
      ) {
        usersWithAccessSet.add(u.id);
      }
    });
    
    const activePaidSubscriptions = allUsers.filter(u => 
      (u.subscriptionTier === "monthly" || u.subscriptionTier === "yearly") &&
      u.subscriptionExpiresAt &&
      new Date(u.subscriptionExpiresAt) > now
    ).length;

    return {
      totalUsers: allUsers.length,
      usersWithAccess: usersWithAccessSet.size,
      activeToday,
      activePaidSubscriptions,
      totalStrategies: allStrategies.length,
      totalVoicePosts: allVoicePosts.length,
      totalCaseStudies: allCaseStudies.length,
      subscriptionBreakdown,
      activeTrials,
      expiredTrials,
    };
  }

  // Generation Limits
  async canGenerateStrategy(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { allowed: false, reason: "Пользователь не найден" };
    }

    // Admins have unlimited access
    if (user.isAdmin) {
      return { allowed: true, remaining: -1 };
    }

    // Paid users (monthly or yearly tier) have unlimited generations
    if (user.subscriptionTier === "monthly" || user.subscriptionTier === "yearly") {
      if (user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()) {
        return { allowed: true, remaining: -1 };
      }
    }

    // Users with active trial have unlimited access during trial period
    const now = new Date();
    if (user.trialEndsAt && user.trialEndsAt > now) {
      return { allowed: true, remaining: -1 };
    }

    // Trial expired - no access
    return { 
      allowed: false, 
      reason: "Пробный период закончился. Оформите подписку для продолжения работы.",
      remaining: 0
    };
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

  // Promocode Methods
  async activatePromocode(userId: string, code: string): Promise<{ success: boolean; message: string; bonusDays?: number }> {
    const normalizedCode = code.trim().toUpperCase();
    
    // Find promocode
    const [promocode] = await db.select().from(promocodes)
      .where(eq(promocodes.code, normalizedCode));
    
    if (!promocode) {
      return { success: false, message: "Промокод не найден" };
    }

    if (!promocode.isActive) {
      return { success: false, message: "Промокод неактивен" };
    }

    // Check expiration
    if (promocode.expiresAt && promocode.expiresAt < new Date()) {
      return { success: false, message: "Срок действия промокода истёк" };
    }

    // Check max uses
    if (promocode.maxUses && (promocode.usedCount || 0) >= promocode.maxUses) {
      return { success: false, message: "Промокод исчерпан" };
    }

    // Check if user already used this promocode
    const [existingUsage] = await db.select().from(promocodeUsages)
      .where(and(
        eq(promocodeUsages.promocodeId, promocode.id),
        eq(promocodeUsages.userId, userId)
      ));

    if (existingUsage) {
      return { success: false, message: "Вы уже использовали этот промокод" };
    }

    // Apply bonus days
    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, message: "Пользователь не найден" };
    }

    const now = new Date();
    const bonusDays = promocode.bonusDays || 30;
    
    // Extend current subscription or trial
    let newExpiresAt: Date;
    if (user.subscriptionTier === "monthly" || user.subscriptionTier === "yearly") {
      const currentExpires = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now 
        ? user.subscriptionExpiresAt 
        : now;
      newExpiresAt = new Date(currentExpires);
      newExpiresAt.setDate(newExpiresAt.getDate() + bonusDays);
      
      await this.updateUser(userId, {
        subscriptionExpiresAt: newExpiresAt,
      });
    } else {
      const currentTrialEnds = user.trialEndsAt && user.trialEndsAt > now 
        ? user.trialEndsAt 
        : now;
      newExpiresAt = new Date(currentTrialEnds);
      newExpiresAt.setDate(newExpiresAt.getDate() + bonusDays);
      
      await this.updateUser(userId, {
        subscriptionTier: "monthly",
        subscriptionExpiresAt: newExpiresAt,
      });
    }

    // Record usage
    await db.insert(promocodeUsages).values({
      promocodeId: promocode.id,
      userId: userId,
    });

    // Increment used count
    await db.update(promocodes).set({
      usedCount: (promocode.usedCount || 0) + 1,
    }).where(eq(promocodes.id, promocode.id));

    return { 
      success: true, 
      message: `Промокод активирован! Добавлено ${bonusDays} дней`, 
      bonusDays 
    };
  }

  async createPromocode(data: { code: string; bonusDays: number; maxUses?: number; expiresAt?: Date }): Promise<Promocode> {
    const [created] = await db.insert(promocodes).values({
      code: data.code.toUpperCase(),
      bonusDays: data.bonusDays,
      maxUses: data.maxUses || 1,
      expiresAt: data.expiresAt,
    }).returning();
    return created;
  }

  async getAllPromocodes(): Promise<Promocode[]> {
    return db.select().from(promocodes).orderBy(desc(promocodes.createdAt));
  }

  // Payments
  async recordPayment(data: { userId: string; orderId: string; amount: string; planType: string; status: string; prodamusData?: any }): Promise<Payment> {
    const [payment] = await db.insert(payments).values({
      userId: data.userId,
      orderId: data.orderId,
      amount: data.amount,
      planType: data.planType,
      status: data.status,
      prodamusData: data.prodamusData,
    }).returning();
    return payment;
  }

  async getPaymentHistory(userId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
    return payment;
  }
}

export const storage = new DatabaseStorage();
