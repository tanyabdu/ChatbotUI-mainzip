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
  type ContentAlchemyPlan, type InsertContentAlchemyPlan,
  type GrimoireTopic, type InsertGrimoireTopic,
  type ConsentLog, type InsertConsentLog,
  users, contentStrategies, archetypeResults, voicePosts, caseStudies,
  salesTrainerSamples, salesTrainerSessions, passwordResetTokens,
  promocodes, promocodeUsages, payments, contentAlchemyPlans, grimoireTopics,
  consentLogs, usageEvents
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, and, isNull, gt, gte, sql, count } from "drizzle-orm";

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
  updateContentStrategyPosts(id: string, userId: string, posts: any[]): Promise<ContentStrategy | undefined>;
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
  getUserAccessSources(): Promise<Map<string, { hasPayment: boolean; hasPromocode: boolean; promoCodes: string[] }>>;
  getAdminStats(params?: { from?: Date; to?: Date }): Promise<{
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
    activeMonthly: number;
    activeYearly: number;
    noAccess: number;
    newUsersLast7Days: number;
    newUsersLast30Days: number;
    totalSuccessfulPayments: number;
    paidMonthlyPayments: number;
    paidYearlyPayments: number;
    paidWithMoney: number;
    paidWithPromocode: number;
    paidBoth: number;
    periodNewUsers: number;
    periodPayments: number;
    periodPromoUsages: number;
    promocodeStats: Array<{
      code: string;
      usedCount: number;
      maxUses: number | null;
      type: string;
      discountPercent: number | null;
      bonusDays: number;
      isActive: boolean;
      expiresAt: Date | null;
      bonusUntil: Date | null;
    }>;
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
  getAllPayments(): Promise<(Payment & { userEmail?: string; userName?: string })[]>;
  getPaymentByOrderId(orderId: string): Promise<Payment | undefined>;
  updatePaymentStatus(orderId: string, status: string, prodamusData?: any): Promise<void>;
  
  // Content Alchemy
  getContentAlchemyPlans(userId: string): Promise<ContentAlchemyPlan[]>;
  createContentAlchemyPlan(plan: InsertContentAlchemyPlan): Promise<ContentAlchemyPlan>;
  
  // Grimoire Topics
  getGrimoireTopics(userId: string): Promise<GrimoireTopic[]>;
  getGrimoireTopic(id: string, userId: string): Promise<GrimoireTopic | undefined>;
  createGrimoireTopic(topic: InsertGrimoireTopic): Promise<GrimoireTopic>;

  // Usage Events
  logUsageEvent(userId: string, section: string): Promise<void>;
  getUsageStats(period: "day" | "week" | "month"): Promise<{ section: string; label: string; count: number }[]>;

  // Newsletter
  getNewsletterRecipients(segment: string, marketingOnly: boolean): Promise<{ email: string; firstName: string | null }[]>;
  updateGrimoireTopic(id: string, userId: string, data: Partial<InsertGrimoireTopic>): Promise<GrimoireTopic | undefined>;
  deleteGrimoireTopic(id: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
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

  async updateContentStrategyPosts(id: string, userId: string, posts: any[]): Promise<ContentStrategy | undefined> {
    const [updated] = await db.update(contentStrategies)
      .set({ posts })
      .where(and(eq(contentStrategies.id, id), eq(contentStrategies.userId, userId)))
      .returning();
    return updated;
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
    await db.delete(payments).where(eq(payments.userId, id));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
    await db.delete(promocodeUsages).where(eq(promocodeUsages.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getUserAccessSources(): Promise<Map<string, { hasPayment: boolean; hasPromocode: boolean; promoCodes: string[] }>> {
    const allPayments = await db.select().from(payments).where(eq(payments.status, "success"));
    const allUsages = await db.select({
      userId: promocodeUsages.userId,
      code: promocodes.code,
    }).from(promocodeUsages).innerJoin(promocodes, eq(promocodeUsages.promocodeId, promocodes.id));

    const result = new Map<string, { hasPayment: boolean; hasPromocode: boolean; promoCodes: string[] }>();

    for (const p of allPayments) {
      const existing = result.get(p.userId) ?? { hasPayment: false, hasPromocode: false, promoCodes: [] };
      existing.hasPayment = true;
      result.set(p.userId, existing);
    }
    for (const u of allUsages) {
      const existing = result.get(u.userId) ?? { hasPayment: false, hasPromocode: false, promoCodes: [] };
      existing.hasPromocode = true;
      if (!existing.promoCodes.includes(u.code)) existing.promoCodes.push(u.code);
      result.set(u.userId, existing);
    }
    return result;
  }

  async getAdminStats(params?: { from?: Date; to?: Date }) {
    const allUsers = await db.select().from(users);
    const allStrategies = await db.select().from(contentStrategies);
    const allVoicePosts = await db.select().from(voicePosts);
    const allCaseStudies = await db.select().from(caseStudies);
    const allPayments = await db.select().from(payments);
    const allPromocodes = await db.select().from(promocodes);
    const allPromoUsages = await db.select().from(promocodeUsages);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { from, to } = params ?? {};

    const subscriptionBreakdown = {
      trial: allUsers.filter(u => u.subscriptionTier === "trial").length,
      free: allUsers.filter(u => !u.subscriptionTier || u.subscriptionTier === "free").length,
      monthly: allUsers.filter(u => u.subscriptionTier === "monthly").length,
      yearly: allUsers.filter(u => u.subscriptionTier === "yearly").length,
    };
    
    const activeTrials = allUsers.filter(u => u.trialEndsAt && new Date(u.trialEndsAt) > now && u.subscriptionTier === "trial").length;
    const activeMonthly = allUsers.filter(u => u.subscriptionTier === "monthly" && u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt) > now).length;
    const activeYearly = allUsers.filter(u => u.subscriptionTier === "yearly" && u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt) > now).length;
    const noAccess = allUsers.filter(u => !u.isAdmin && !(u.trialEndsAt && new Date(u.trialEndsAt) > now && u.subscriptionTier === "trial") && !((u.subscriptionTier === "monthly" || u.subscriptionTier === "yearly") && u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt) > now)).length;
    const expiredTrials = allUsers.filter(u => u.trialEndsAt && new Date(u.trialEndsAt) <= now).length;
    
    const activeToday = allUsers.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) >= todayStart).length;
    
    const newUsersLast7Days = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= last7Days).length;
    const newUsersLast30Days = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= last30Days).length;
    
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

    const successfulPayments = allPayments.filter(p => p.status === "success");
    const totalSuccessfulPayments = successfulPayments.length;
    const paidMonthlyPayments = successfulPayments.filter(p => p.planType === "monthly").length;
    const paidYearlyPayments = successfulPayments.filter(p => p.planType === "yearly").length;

    // Users who paid with real money (have ≥1 successful payment)
    const usersWithPayment = new Set(successfulPayments.map(p => p.userId));
    // Users who used a promo code
    const usersWithPromo = new Set(allPromoUsages.map(u => u.userId));
    const paidWithMoney = Array.from(usersWithPayment).filter(id => !usersWithPromo.has(id)).length;
    const paidWithPromocode = Array.from(usersWithPromo).filter(id => !usersWithPayment.has(id)).length;
    const paidBoth = Array.from(usersWithPayment).filter(id => usersWithPromo.has(id)).length;

    // Period-specific stats (filtered by from/to if provided)
    const inPeriod = (date: Date | null | undefined) => {
      if (!date) return false;
      const d = new Date(date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    };
    const periodNewUsers = from || to ? allUsers.filter(u => inPeriod(u.createdAt)).length : newUsersLast30Days;
    const periodPayments = from || to ? successfulPayments.filter(p => inPeriod(p.createdAt)).length : totalSuccessfulPayments;
    const periodPromoUsages = from || to ? allPromoUsages.filter(u => inPeriod(u.usedAt)).length : allPromoUsages.length;

    const promocodeStats = allPromocodes.map(p => ({
      code: p.code,
      usedCount: p.usedCount ?? 0,
      maxUses: p.maxUses,
      type: p.promocodeType ?? "bonus",
      discountPercent: p.discountPercent,
      bonusDays: p.bonusDays,
      isActive: p.isActive ?? false,
      expiresAt: p.expiresAt,
      bonusUntil: p.bonusUntil,
    }));

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
      activeMonthly,
      activeYearly,
      noAccess,
      newUsersLast7Days,
      newUsersLast30Days,
      totalSuccessfulPayments,
      paidMonthlyPayments,
      paidYearlyPayments,
      paidWithMoney,
      paidWithPromocode,
      paidBoth,
      periodNewUsers,
      periodPayments,
      periodPromoUsages,
      promocodeStats,
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
  async activatePromocode(userId: string, code: string): Promise<{ success: boolean; message: string; bonusDays?: number; isDiscount?: boolean; discountPercent?: number; promoCode?: string }> {
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

    if (promocode.promocodeType === 'discount') {
      return { 
        success: true, 
        message: `Промокод даёт скидку ${promocode.discountPercent}% на оплату подписки. Перейдите на страницу тарифов для оплаты со скидкой.`,
        isDiscount: true,
        discountPercent: promocode.discountPercent ?? undefined,
        promoCode: normalizedCode
      };
    }

    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, message: "Пользователь не найден" };
    }

    const now = new Date();
    let newExpiresAt: Date;
    let bonusDays: number;
    let successMessage: string;

    if (promocode.bonusUntil) {
      if (promocode.bonusUntil <= now) {
        return { success: false, message: "Срок действия промокода истёк" };
      }
      const bonusEndDate = new Date(promocode.bonusUntil);
      const currentExpires = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? user.subscriptionExpiresAt
        : (user.trialEndsAt && user.trialEndsAt > now ? user.trialEndsAt : now);
      newExpiresAt = currentExpires > bonusEndDate ? currentExpires : bonusEndDate;
      bonusDays = Math.ceil((newExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
      const dateStr = `${bonusEndDate.getUTCDate()} ${months[bonusEndDate.getUTCMonth()]}`;
      successMessage = `Промокод активирован! Доступ до ${dateStr} включительно`;
    } else {
      bonusDays = promocode.bonusDays || 0;
      if (bonusDays <= 0) {
        return { success: false, message: "Промокод не содержит бонусных дней" };
      }
      
      if (user.subscriptionTier === "monthly" || user.subscriptionTier === "yearly") {
        const currentExpires = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now 
          ? user.subscriptionExpiresAt 
          : now;
        newExpiresAt = new Date(currentExpires);
      } else {
        const currentTrialEnds = user.trialEndsAt && user.trialEndsAt > now 
          ? user.trialEndsAt 
          : now;
        newExpiresAt = new Date(currentTrialEnds);
      }
      newExpiresAt.setDate(newExpiresAt.getDate() + bonusDays);
      successMessage = `Промокод активирован! Добавлено ${bonusDays} дней`;
    }

    if (user.subscriptionTier === "monthly" || user.subscriptionTier === "yearly") {
      await this.updateUser(userId, {
        subscriptionExpiresAt: newExpiresAt,
      });
    } else {
      await this.updateUser(userId, {
        subscriptionTier: "monthly",
        subscriptionExpiresAt: newExpiresAt,
      });
    }

    await db.insert(promocodeUsages).values({
      promocodeId: promocode.id,
      userId: userId,
    });

    await db.update(promocodes).set({
      usedCount: (promocode.usedCount || 0) + 1,
    }).where(eq(promocodes.id, promocode.id));

    return { 
      success: true, 
      message: successMessage, 
      bonusDays 
    };
  }

  async verifyDiscountPromocode(userId: string, code: string): Promise<{ success: boolean; message: string; discountPercent?: number; applicablePlans?: string[]; promocodeId?: string }> {
    const normalizedCode = code.trim().toUpperCase();

    const [promocode] = await db.select().from(promocodes)
      .where(eq(promocodes.code, normalizedCode));

    if (!promocode) {
      return { success: false, message: "Промокод не найден" };
    }

    if (!promocode.isActive) {
      return { success: false, message: "Промокод неактивен" };
    }

    if (promocode.promocodeType !== 'discount') {
      const bonusResult = await this.activatePromocode(userId, code);
      if (bonusResult.success) {
        return { success: true, message: bonusResult.message, bonusActivated: true } as any;
      }
      return { success: false, message: bonusResult.message };
    }

    if (promocode.expiresAt && promocode.expiresAt < new Date()) {
      return { success: false, message: "Срок действия промокода истёк" };
    }

    if (promocode.maxUses && (promocode.usedCount || 0) >= promocode.maxUses) {
      return { success: false, message: "Промокод исчерпан" };
    }

    const [existingUsage] = await db.select().from(promocodeUsages)
      .where(and(
        eq(promocodeUsages.promocodeId, promocode.id),
        eq(promocodeUsages.userId, userId)
      ));

    if (existingUsage) {
      return { success: false, message: "Вы уже использовали этот промокод" };
    }

    const applicablePlans = promocode.discountPlanType
      ? [promocode.discountPlanType]
      : ['monthly', 'yearly'];

    return {
      success: true,
      message: `Скидка ${promocode.discountPercent}% применена`,
      discountPercent: promocode.discountPercent || 0,
      applicablePlans,
      promocodeId: promocode.id,
    };
  }

  async recordPromocodeUsageForDiscount(promocodeId: string, userId: string): Promise<void> {
    await db.insert(promocodeUsages).values({
      promocodeId,
      userId,
    });
    const [promo] = await db.select().from(promocodes).where(eq(promocodes.id, promocodeId));
    if (promo) {
      await db.update(promocodes).set({
        usedCount: (promo.usedCount || 0) + 1,
      }).where(eq(promocodes.id, promocodeId));
    }
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

  async getAllPayments(): Promise<(Payment & { userEmail?: string; userName?: string })[]> {
    const rows = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        orderId: payments.orderId,
        amount: payments.amount,
        planType: payments.planType,
        status: payments.status,
        prodamusData: payments.prodamusData,
        createdAt: payments.createdAt,
        userEmail: users.email,
        userName: users.firstName,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(500);
    return rows;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
    return payment;
  }

  async updatePaymentStatus(orderId: string, status: string, prodamusData?: any): Promise<void> {
    if (prodamusData !== undefined && prodamusData !== null) {
      await db.execute(sql`
        UPDATE esoteric_planner.payments 
        SET status = ${status}, prodamus_data = ${JSON.stringify(prodamusData)}::jsonb
        WHERE order_id = ${orderId}
      `);
    } else {
      await db.execute(sql`
        UPDATE esoteric_planner.payments 
        SET status = ${status}
        WHERE order_id = ${orderId}
      `);
    }
  }

  async getContentAlchemyPlans(userId: string): Promise<ContentAlchemyPlan[]> {
    return db.select().from(contentAlchemyPlans).where(eq(contentAlchemyPlans.userId, userId)).orderBy(desc(contentAlchemyPlans.createdAt));
  }

  async createContentAlchemyPlan(plan: InsertContentAlchemyPlan): Promise<ContentAlchemyPlan> {
    const [created] = await db.insert(contentAlchemyPlans).values(plan).returning();
    return created;
  }

  async getGrimoireTopics(userId: string): Promise<GrimoireTopic[]> {
    return db.select().from(grimoireTopics).where(eq(grimoireTopics.userId, userId)).orderBy(grimoireTopics.day);
  }

  async getGrimoireTopic(id: string, userId: string): Promise<GrimoireTopic | undefined> {
    const [topic] = await db.select().from(grimoireTopics).where(and(eq(grimoireTopics.id, id), eq(grimoireTopics.userId, userId)));
    return topic;
  }

  async createGrimoireTopic(topic: InsertGrimoireTopic): Promise<GrimoireTopic> {
    const [created] = await db.insert(grimoireTopics).values(topic).returning();
    return created;
  }

  async updateGrimoireTopic(id: string, userId: string, data: Partial<InsertGrimoireTopic>): Promise<GrimoireTopic | undefined> {
    const [updated] = await db.update(grimoireTopics)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(grimoireTopics.id, id), eq(grimoireTopics.userId, userId)))
      .returning();
    return updated;
  }

  async deleteGrimoireTopic(id: string, userId: string): Promise<void> {
    await db.delete(grimoireTopics).where(and(eq(grimoireTopics.id, id), eq(grimoireTopics.userId, userId)));
  }

  async deleteContentAlchemyPlan(planId: string, userId: string): Promise<void> {
    await db.delete(grimoireTopics).where(and(eq(grimoireTopics.planId, planId), eq(grimoireTopics.userId, userId)));
    await db.delete(contentAlchemyPlans).where(and(eq(contentAlchemyPlans.id, planId), eq(contentAlchemyPlans.userId, userId)));
  }

  async createConsentLog(data: InsertConsentLog): Promise<ConsentLog> {
    const [log] = await db.insert(consentLogs).values(data).returning();
    return log;
  }

  async getConsentLogs(userId: string): Promise<ConsentLog[]> {
    return db.select().from(consentLogs).where(eq(consentLogs.userId, userId)).orderBy(desc(consentLogs.createdAt));
  }

  async logUsageEvent(userId: string, section: string): Promise<void> {
    await db.insert(usageEvents).values({ userId, section });
  }

  async getUsageStats(period: "day" | "week" | "month"): Promise<{ section: string; label: string; count: number }[]> {
    const now = new Date();
    let since: Date;
    if (period === "day") {
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === "week") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const SECTION_LABELS: Record<string, string> = {
      generator: "Генератор контента",
      alchemy: "Алхимия контента",
      triggerReels: "Триггерные Reels",
      threads: "Треды",
      voice: "Голос потока",
      cases: "Кейсы",
      trainer: "Денежный тренажёр",
      archetype: "Архетип стратегии",
    };

    const rows = await db
      .select({ section: usageEvents.section, cnt: count() })
      .from(usageEvents)
      .where(gte(usageEvents.createdAt, since))
      .groupBy(usageEvents.section)
      .orderBy(desc(count()));

    return rows.map(r => ({
      section: r.section,
      label: SECTION_LABELS[r.section] ?? r.section,
      count: Number(r.cnt),
    }));
  }

  async getNewsletterRecipients(segment: string, marketingOnly: boolean): Promise<{ email: string; firstName: string | null }[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const conditions: any[] = [eq(users.isAdmin, false)];

    if (marketingOnly) {
      conditions.push(eq(users.marketingConsent, true));
    }

    switch (segment) {
      case "trial":
        conditions.push(eq(users.subscriptionTier, "trial"));
        break;
      case "monthly":
        conditions.push(eq(users.subscriptionTier, "monthly"));
        break;
      case "yearly":
        conditions.push(eq(users.subscriptionTier, "yearly"));
        break;
      case "free":
        conditions.push(eq(users.subscriptionTier, "free"));
        break;
      case "active":
        conditions.push(gte(users.lastLoginAt, thirtyDaysAgo));
        break;
      case "inactive":
        conditions.push(
          or(isNull(users.lastLoginAt), sql`${users.lastLoginAt} < ${thirtyDaysAgo}`)
        );
        break;
      case "new7":
        conditions.push(gte(users.createdAt, sevenDaysAgo));
        break;
      case "new30":
        conditions.push(gte(users.createdAt, thirtyDaysAgo));
        break;
      // "all" — no extra condition
    }

    const rows = await db
      .select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(and(...conditions));

    return rows;
  }
}

export const storage = new DatabaseStorage();
