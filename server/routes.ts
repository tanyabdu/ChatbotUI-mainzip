import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { 
  insertContentStrategySchema, insertArchetypeResultSchema, insertVoicePostSchema, 
  insertCaseStudySchema, insertSalesTrainerSampleSchema,
  InsertContentStrategy, InsertArchetypeResult, InsertCaseStudy, InsertSalesTrainerSample
} from "@shared/schema";
import { setupAuth, isAuthenticated, requireAdmin } from "./auth";
import { generateImprovedAnswer } from "./services/moneyTrainer";
import { generateCase, cleanOcrText } from "./services/caseGenerator";
import { generateContentStrategy, generateIdeasOnly, generateSingleFormat } from "./services/contentGenerator";
import { createPaymentLink, verifyWebhookSignature, parseWebhookData } from "./services/prodamus";
import { sendPaymentNotification, sendEmail, generateUnsubscribeToken, verifyUnsubscribeToken, appendUnsubscribeFooter } from "./services/email";
import { transcribeAudio } from "./services/yandexSpeechKit";
import { generateContentPlan, generateQuestions, generatePostFromAnswers } from "./services/contentAlchemy";
import { transformToTriggerReels } from "./services/triggerReels";
import { generateThreadsPosts } from "./services/threadsGenerator";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

function unsubscribeHtmlPage(type: "success" | "error", message: string): string {
  const color = type === "success" ? "#7C3AED" : "#EF4444";
  const icon = type === "success" ? "✅" : "❌";
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Отписка от рассылки — Эзотерический Планировщик</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #F9FAFB; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 16px; padding: 40px 32px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: ${color}; font-size: 22px; margin: 0 0 12px; }
    p { color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; color: #7C3AED; text-decoration: none; font-size: 14px; border-bottom: 1px solid #E9D5FF; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${type === "success" ? "Отписка выполнена" : "Ошибка"}</h1>
    <p>${message}</p>
    <a href="/">Вернуться на сайт</a>
  </div>
</body>
</html>`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication
  await setupAuth(app);

  // Update user profile
  app.patch("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { nickname } = req.body;
      const user = await storage.updateUser(userId, { nickname });
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch("/api/auth/marketing-consent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { marketingConsent } = req.body;
      const user = await storage.updateUser(userId, { 
        marketingConsent: !!marketingConsent,
        marketingConsentAt: marketingConsent ? new Date() : null,
      });

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
      const userAgent = req.headers['user-agent'] || '';
      await storage.createConsentLog({
        userId,
        consentType: "marketing",
        granted: !!marketingConsent,
        ipAddress,
        userAgent,
        documentVersion: "2026-02",
      });

      res.json({ marketingConsent: user?.marketingConsent });
    } catch (error) {
      console.error("Error updating marketing consent:", error);
      res.status(500).json({ message: "Ошибка при обновлении согласия" });
    }
  });

  // Content Strategies (protected routes)
  app.get("/api/strategies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const strategies = await storage.getContentStrategies(userId);
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategies" });
    }
  });

  app.get("/api/strategies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const strategy = await storage.getContentStrategy(req.params.id, userId);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategy" });
    }
  });

  app.get("/api/generation-limit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = await storage.canGenerateStrategy(userId);
      res.json(limit);
    } catch (error) {
      res.status(500).json({ error: "Failed to check generation limit" });
    }
  });

  // Generate content strategy using AI (legacy - full generation)
  app.post("/api/strategies/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check generation limit
      const limitCheck = await storage.canGenerateStrategy(userId);
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.reason, limitReached: true });
      }
      
      const { goal, niche, days, product, strategy, archetype } = req.body;
      
      if (!goal || !niche || !days) {
        return res.status(400).json({ error: "Missing required fields: goal, niche, days" });
      }
      
      const daysNumber = days === "today" ? 1 : parseInt(days) || 1;
      
      console.log("Generating content strategy:", { goal, niche, days: daysNumber, product, strategy, archetype: !!archetype });
      
      const generatedContent = await generateContentStrategy({
        goal,
        niche,
        days: daysNumber,
        product,
        strategy,
        archetype,
      });
      
      // Increment daily generation count only on success
      await storage.incrementDailyGeneration(userId);
      
      res.json({ content: generatedContent });
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({ error: "Ошибка генерации контента. Попробуйте ещё раз." });
    }
  });

  // Step 1: Generate only ideas (fast)
  app.post("/api/strategies/generate-ideas", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const limitCheck = await storage.canGenerateStrategy(userId);
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.reason, limitReached: true });
      }
      
      const { goal, niche, days, product, strategy, archetype } = req.body;
      
      if (!goal || !niche || !days) {
        return res.status(400).json({ error: "Missing required fields: goal, niche, days" });
      }
      
      const daysNumber = days === "today" ? 1 : parseInt(days) || 1;
      
      // Get user's gender from latest archetype result (default to female for new users)
      const latestArchetype = await storage.getLatestArchetypeResult(userId);
      const gender: "female" | "male" = (latestArchetype?.gender === "male") ? "male" : "female";
      
      console.log("Generating ideas only:", { goal, niche, days: daysNumber, gender });
      
      const ideas = await generateIdeasOnly({
        goal,
        niche,
        days: daysNumber,
        product,
        strategy,
        archetype,
      });
      
      // Increment daily generation count
      await storage.incrementDailyGeneration(userId);
      
      storage.logUsageEvent(userId, "generator").catch(() => {});
      res.json({ ideas, context: { goal, niche, product, archetype, gender } });
    } catch (error) {
      console.error("Ideas generation error:", error);
      res.status(500).json({ error: "Ошибка генерации идей. Попробуйте ещё раз." });
    }
  });

  // Step 2: Generate single format content (on demand)
  app.post("/api/strategies/generate-format", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { goal, niche, product, idea, type, format, archetype } = req.body;
      let { gender } = req.body;
      
      if (!goal || !niche || !idea || !type || !format) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Fallback: get gender from user's archetype if not provided
      if (!gender) {
        const latestArchetype = await storage.getLatestArchetypeResult(userId);
        gender = latestArchetype?.gender || "female";
      }
      
      console.log(`Generating ${format} for: ${idea.substring(0, 50)}..., gender: ${gender}`);
      
      const content = await generateSingleFormat({
        goal,
        niche,
        product,
        idea,
        type,
        format,
        gender,
        archetype,
      });
      
      res.json({ content });
    } catch (error) {
      console.error("Format generation error:", error);
      res.status(500).json({ error: "Ошибка генерации контента. Попробуйте ещё раз." });
    }
  });

  app.post("/api/strategies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      console.log("Saving strategy for user:", userId);
      
      // Validate with Zod schema (days is auto-coerced to number)
      const parsed = insertContentStrategySchema.safeParse({ 
        ...req.body, 
        userId
      });
      
      if (!parsed.success) {
        console.error("Strategy validation failed:", parsed.error.flatten());
        return res.status(400).json({ error: "Ошибка валидации данных" });
      }
      
      const strategy = await storage.createContentStrategy(parsed.data as InsertContentStrategy);
      
      console.log("Strategy saved successfully:", strategy.id);
      res.status(201).json(strategy);
    } catch (error: any) {
      console.error("Strategy save error:", error);
      res.status(500).json({ error: error.message || "Ошибка сохранения стратегии" });
    }
  });

  app.delete("/api/strategies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.deleteContentStrategy(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete strategy" });
    }
  });

  app.post("/api/strategies/:id/generate-format", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const strategyId = req.params.id;
      const { postDay, format } = req.body;

      const parsedDay = typeof postDay === 'number' ? postDay : parseInt(postDay);
      if (!Number.isFinite(parsedDay) || parsedDay < 1) {
        return res.status(400).json({ error: "Invalid postDay" });
      }

      const allowedFormats = ["post", "carousel", "reels", "stories"];
      if (!format || !allowedFormats.includes(format)) {
        return res.status(400).json({ error: "Invalid format" });
      }

      const canGenerate = await storage.canGenerateStrategy(userId);
      if (!canGenerate.allowed) {
        return res.status(403).json({ error: canGenerate.reason || "Лимит генераций исчерпан" });
      }

      const strategy = await storage.getContentStrategy(strategyId, userId);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }

      const posts = strategy.posts as any[];
      const postIndex = posts.findIndex((p: any) => p.day === parsedDay);
      if (postIndex === -1) {
        return res.status(404).json({ error: "Post not found" });
      }

      const post = posts[postIndex];
      const latestArchetype = await storage.getLatestArchetypeResult(userId);
      const gender = latestArchetype?.gender || "female";

      console.log(`Generating ${format} for strategy ${strategyId}, day ${parsedDay}`);

      await storage.incrementDailyGeneration(userId);

      const content = await generateSingleFormat({
        goal: strategy.goal as "sale" | "engagement",
        niche: strategy.topic,
        product: undefined,
        idea: post.idea,
        type: post.type,
        format,
        gender: gender as "female" | "male",
        archetype: latestArchetype ? {
          name: latestArchetype.archetypeName,
          description: latestArchetype.archetypeDescription || "",
          recommendations: latestArchetype.recommendations || [],
        } : undefined,
      });

      posts[postIndex][format] = content;

      const updated = await storage.updateContentStrategyPosts(strategyId, userId, posts);
      if (!updated) {
        return res.status(500).json({ error: "Failed to update strategy" });
      }

      res.json({ content, strategy: updated });
    } catch (error: any) {
      console.error("Strategy format generation error:", error);
      res.status(500).json({ error: "Ошибка генерации контента. Попробуйте ещё раз." });
    }
  });

  // Archetype Results (protected routes)
  app.get("/api/archetypes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const results = await storage.getArchetypeResults(userId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch archetype results" });
    }
  });

  app.get("/api/archetypes/latest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await storage.getLatestArchetypeResult(userId);
      res.json(result || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest archetype result" });
    }
  });

  app.post("/api/archetypes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertArchetypeResultSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const result = await storage.createArchetypeResult(parsed.data as InsertArchetypeResult);
      storage.logUsageEvent(userId, "archetype").catch(() => {});
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to save archetype result" });
    }
  });

  // Voice Posts (protected routes)
  app.get("/api/voice-posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const posts = await storage.getVoicePosts(userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch voice posts" });
    }
  });

  app.post("/api/voice-posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertVoicePostSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const post = await storage.createVoicePost(parsed.data);
      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to save voice post" });
    }
  });

  app.delete("/api/voice-posts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.deleteVoicePost(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete voice post" });
    }
  });

  app.post("/api/voice-posts/transcribe", isAuthenticated, upload.single("audio"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const mimeType = req.file.mimetype || "audio/webm";
      const transcript = await transcribeAudio(req.file.buffer, mimeType);
      
      res.json({ transcript });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio" });
    }
  });

  app.post("/api/voice-posts/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { transcript } = req.body;
      
      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const limitCheck = await storage.canGenerateStrategy(userId);
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.reason });
      }

      const { generatePostFromTranscript } = await import("./services/voicePostGenerator");
      const post = await generatePostFromTranscript(transcript);
      
      await storage.incrementDailyGeneration(userId);
      storage.logUsageEvent(userId, "voice").catch(() => {});
      res.json({ post });
    } catch (error: any) {
      console.error("Voice post generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate post" });
    }
  });

  // Case Studies (protected routes)
  app.get("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const query = req.query.q as string | undefined;
      const cases = query 
        ? await storage.searchCaseStudies(query, userId)
        : await storage.getCaseStudies(userId);
      res.json(cases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch case studies" });
    }
  });

  app.get("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const caseStudy = await storage.getCaseStudy(req.params.id, userId);
      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }
      res.json(caseStudy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch case study" });
    }
  });

  app.post("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertCaseStudySchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const caseStudy = await storage.createCaseStudy(parsed.data as InsertCaseStudy);
      res.status(201).json(caseStudy);
    } catch (error) {
      res.status(500).json({ error: "Failed to create case study" });
    }
  });

  app.delete("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.deleteCaseStudy(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete case study" });
    }
  });

  app.post("/api/cases/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { reviewText, before, action, after, tags } = req.body;
      
      if (!reviewText) {
        return res.status(400).json({ error: "Текст отзыва обязателен" });
      }
      
      const generated = await generateCase({
        reviewText,
        before: before || "",
        action: action || "",
        after: after || "",
        tags: tags || []
      });

      const _caseUserId = req.user?.id;
      if (_caseUserId) storage.logUsageEvent(_caseUserId, "cases").catch(() => {});
      res.json(generated);
    } catch (error: any) {
      console.error("Case generation error:", error);
      res.status(500).json({ error: error.message || "Ошибка генерации кейса" });
    }
  });

  app.post("/api/cases/clean-ocr", isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Текст обязателен" });
      }
      
      const cleaned = cleanOcrText(text);
      res.json({ cleaned });
    } catch (error: any) {
      res.status(500).json({ error: "Ошибка очистки текста" });
    }
  });

  // Admin Routes
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      return next();
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  };

  app.get("/api/admin/stats", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const params: { from?: Date; to?: Date } = {};
      if (from) params.from = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        params.to = toDate;
      }
      const stats = await storage.getAdminStats(params);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/access-sources", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const sourcesMap = await storage.getUserAccessSources();
      const result: Record<string, { hasPayment: boolean; hasPromocode: boolean; promoCodes: string[] }> = {};
      sourcesMap.forEach((val, key) => { result[key] = val; });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch access sources" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { action, days, tier } = req.body;
      
      if (action === "extend") {
        const user = await storage.extendUserAccess(id, days || 30, tier);
        if (!user) {
          return res.status(404).json({ error: "Пользователь не найден" });
        }
        res.json(user);
      } else if (action === "setAdmin") {
        console.log(`[Admin] Setting isAdmin=${req.body.isAdmin} for user ${id}`);
        const user = await storage.updateUser(id, { isAdmin: req.body.isAdmin });
        console.log(`[Admin] Updated user:`, user?.id, user?.email, `isAdmin=${user?.isAdmin}`);
        if (!user) {
          return res.status(404).json({ error: "Пользователь не найден" });
        }
        res.json(user);
      } else {
        res.status(400).json({ error: "Неизвестное действие" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      
      if (id === currentUserId) {
        return res.status(400).json({ error: "Нельзя удалить самого себя" });
      }
      
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Access check route
  app.get("/api/auth/access", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const access = await storage.hasActiveAccess(userId);
      res.json(access);
    } catch (error) {
      res.status(500).json({ error: "Failed to check access" });
    }
  });

  // Money Trainer Routes
  app.get("/api/trainer/samples", isAuthenticated, async (req: any, res) => {
    try {
      const samples = await storage.getSalesTrainerSamples();
      res.json(samples);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training samples" });
    }
  });

  app.post("/api/trainer/samples", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const parsed = insertSalesTrainerSampleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const sample = await storage.createSalesTrainerSample(parsed.data as InsertSalesTrainerSample);
      res.status(201).json(sample);
    } catch (error) {
      res.status(500).json({ error: "Failed to create training sample" });
    }
  });

  app.get("/api/trainer/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getSalesTrainerSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trainer sessions" });
    }
  });

  app.post("/api/trainer/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { clientQuestion, expertDraft, painType, offerType } = req.body;

      if (!clientQuestion || !expertDraft) {
        return res.status(400).json({ error: "Вопрос клиента и черновик ответа обязательны" });
      }

      // Check generation limit
      const limitCheck = await storage.canGenerateStrategy(userId);
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.reason, limitReached: true });
      }

      // Get relevant training samples
      const samples = painType 
        ? await storage.getSalesTrainerSamplesByPainType(painType)
        : await storage.getSalesTrainerSamples();

      // Generate improved answer using AI
      const improvedAnswer = await generateImprovedAnswer({
        clientQuestion,
        expertDraft,
        painType,
        offerType,
        samples: samples.slice(0, 3),
      });

      // Save session
      const session = await storage.createSalesTrainerSession({
        userId,
        clientQuestion,
        expertDraft,
        improvedAnswer,
        painType,
        offerType,
      });

      // Increment daily generation count
      await storage.incrementDailyGeneration(userId);
      storage.logUsageEvent(userId, "trainer").catch(() => {});
      res.json({ improvedAnswer, sessionId: session.id });
    } catch (error: any) {
      console.error("Trainer generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate improved answer" });
    }
  });

  // Promocode activation
  app.post("/api/promocode/activate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { code } = req.body;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ success: false, message: "Введите промокод" });
      }

      const result = await storage.activatePromocode(userId, code);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("Promocode activation error:", error);
      res.status(500).json({ success: false, message: "Ошибка при активации промокода" });
    }
  });

  // Admin: Create promocode
  app.post("/api/admin/promocodes", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { code, bonusDays, maxUses, expiresAt } = req.body;

      if (!code || !bonusDays) {
        return res.status(400).json({ error: "Укажите код и количество дней" });
      }

      const promocode = await storage.createPromocode({
        code,
        bonusDays: parseInt(bonusDays),
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.json(promocode);
    } catch (error: any) {
      console.error("Create promocode error:", error);
      res.status(500).json({ error: "Ошибка при создании промокода" });
    }
  });

  // Admin: Get all promocodes
  app.get("/api/admin/promocodes", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const promocodes = await storage.getAllPromocodes();
      res.json(promocodes);
    } catch (error: any) {
      console.error("Get promocodes error:", error);
      res.status(500).json({ error: "Ошибка при получении промокодов" });
    }
  });

  // Admin: Get all payments with user info
  app.get("/api/admin/payments", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const allPayments = await storage.getAllPayments();
      res.json(allPayments);
    } catch (error: any) {
      console.error("Get admin payments error:", error);
      res.status(500).json({ error: "Ошибка при получении платежей" });
    }
  });

  const VALID_SEGMENTS = new Set(["all","trial","monthly","yearly","free","active","inactive","new7","new30"]);

  function parseSegments(raw: unknown): string[] {
    const arr: string[] = raw
      ? (Array.isArray(raw) ? raw as string[] : [raw as string])
      : ["all"];
    const filtered = arr.filter(s => VALID_SEGMENTS.has(s));
    return filtered.length > 0 ? filtered : ["all"];
  }

  // Admin: Newsletter — get recipient count by segment
  app.get("/api/admin/newsletter/count", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const segments = parseSegments(req.query.segments);
      const marketingOnly = req.query.marketingOnly !== "false";
      const recipients = await storage.getNewsletterRecipients(segments, marketingOnly);
      res.json({ count: recipients.length });
    } catch (error: any) {
      console.error("Newsletter count error:", error);
      res.status(500).json({ error: "Ошибка при подсчёте получателей" });
    }
  });

  // Admin: Newsletter — send emails
  app.post("/api/admin/newsletter/send", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { segments, marketingOnly = true, subject, html } = req.body;
      const segmentsArr = parseSegments(segments);
      if (!subject?.trim() || !html?.trim()) {
        return res.status(400).json({ error: "Укажите тему и текст письма" });
      }
      const baseUrl = process.env.APP_URL || `https://${req.hostname}`;
      const recipients = await storage.getNewsletterRecipients(segmentsArr, marketingOnly);
      let sent = 0;
      let failed = 0;
      for (const r of recipients) {
        const token = generateUnsubscribeToken(r.email);
        const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${token}&email=${encodeURIComponent(r.email)}`;
        const htmlWithFooter = appendUnsubscribeFooter(html, unsubscribeUrl);
        const ok = await sendEmail({ to: r.email, toName: r.firstName || undefined, subject, html: htmlWithFooter });
        if (ok) sent++; else failed++;
        // small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const total = recipients.length;
      console.log(`[Newsletter] Sent: ${sent}, Failed: ${failed}, Total: ${total}`);
      await storage.saveNewsletterLog({ subject, segment: segmentsArr.join(","), marketingOnly: !!marketingOnly, sent, failed, total });
      res.json({ sent, failed, total });
    } catch (error: any) {
      console.error("Newsletter send error:", error);
      res.status(500).json({ error: "Ошибка при отправке рассылки" });
    }
  });

  // Admin: Newsletter — history
  app.get("/api/admin/newsletter/history", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const logs = await storage.getNewsletterLogs();
      res.json(logs);
    } catch (error: any) {
      console.error("Newsletter history error:", error);
      res.status(500).json({ error: "Ошибка при загрузке истории рассылок" });
    }
  });

  // Unsubscribe from newsletter (no auth required — accessible via email link)
  app.get("/api/unsubscribe", async (req: any, res) => {
    const { token, email } = req.query as { token?: string; email?: string };

    if (!token || !email) {
      return res.status(400).send(unsubscribeHtmlPage("error", "Некорректная ссылка отписки."));
    }

    let tokenValid = false;
    try {
      tokenValid = verifyUnsubscribeToken(email, token);
    } catch {
      tokenValid = false;
    }

    if (!tokenValid) {
      return res.status(400).send(unsubscribeHtmlPage("error", "Недействительная ссылка отписки."));
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).send(unsubscribeHtmlPage("error", "Пользователь не найден."));
    }

    await storage.updateUser(user.id, { marketingConsent: false, marketingConsentAt: null });
    console.log(`[Unsubscribe] User ${email} unsubscribed from newsletter`);

    return res.send(unsubscribeHtmlPage("success", "Вы успешно отписались от рассылки."));
  });

  app.post("/api/promocode/verify-discount", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ success: false, message: "Введите промокод" });
      }
      const result = await storage.verifyDiscountPromocode(req.user.id, code);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("Verify discount promocode error:", error);
      res.status(500).json({ success: false, message: "Ошибка при проверке промокода" });
    }
  });

  // Payments - Create payment link
  app.post("/api/payments/create-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const { planType, promoCode } = req.body;
      
      if (!planType || !['monthly', 'yearly'].includes(planType)) {
        return res.status(400).json({ error: "Укажите тип подписки: monthly или yearly" });
      }

      let discountPercent = 0;
      let appliedPromoId: string | null = null;
      if (promoCode && typeof promoCode === 'string') {
        const promoResult = await storage.verifyDiscountPromocode(userId, promoCode);
        if (promoResult.success && promoResult.discountPercent && promoResult.applicablePlans?.includes(planType)) {
          discountPercent = promoResult.discountPercent;
          appliedPromoId = promoResult.promocodeId || null;
        }
      }

      const basePrice = planType === 'monthly' ? 1690 : 5475;
      const finalPrice = discountPercent > 0 ? Math.round(basePrice * (1 - discountPercent / 100)) : basePrice;

      const orderId = `order_${userId}_${Date.now()}`;
      const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS || req.get('host');
      const baseUrl = `https://${domain}`;

      const { url: paymentUrl, shortOrderId } = createPaymentLink({
        orderId,
        customerEmail: user.email,
        planType,
        userId,
        baseUrl,
        price: `${finalPrice}.00`
      });

      await storage.recordPayment({
        userId,
        orderId: shortOrderId,
        amount: `${finalPrice}.00`,
        planType,
        status: 'pending',
        prodamusData: appliedPromoId ? { appliedPromoId, discountPercent } : null
      });

      console.log(`Payment link created for user ${userId}, plan: ${planType}, order: ${shortOrderId}, price: ${finalPrice}, discount: ${discountPercent}%`);
      
      res.json({ paymentUrl, orderId: shortOrderId });
    } catch (error: any) {
      console.error("Create payment link error:", error);
      res.status(500).json({ error: error.message || "Ошибка при создании ссылки оплаты" });
    }
  });

  // Payments - Webhook from Prodamus
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      console.log("=== PAYMENT WEBHOOK RECEIVED ===");
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));

      // Signature verification - read from 'Sign' header per Prodamus docs
      const signature = req.headers['sign'] as string | undefined;
      if (signature) {
        const isValidSignature = verifyWebhookSignature(req.body, signature);
        if (!isValidSignature) {
          console.warn("Payment webhook: signature verification failed, but continuing");
        } else {
          console.log("Payment webhook: signature verified successfully");
        }
      } else {
        console.warn("Payment webhook: no signature in headers (check Prodamus secret key configuration)");
      }

      const webhookData = parseWebhookData(req.body);
      const orderNum = req.body.order_num || webhookData.order_num || '';
      
      if (!orderNum) {
        return res.status(200).json({ status: "ok", message: "Test or health-check request ignored" });
      }

      const existingPayment = await storage.getPaymentByOrderId(orderNum);
      
      if (!existingPayment) {
        console.log(`Payment not found for order: ${orderNum}, acknowledging to stop retries`);
        return res.json({ success: true, message: "Payment not found, acknowledged" });
      }

      if (existingPayment.status === 'success') {
        console.log(`Payment ${orderNum} already processed, skipping`);
        return res.json({ success: true, message: "Already processed" });
      }

      const paymentStatus = webhookData.payment_status;
      
      if (paymentStatus === 'success') {
        const userId = existingPayment.userId;
        const planType = existingPayment.planType as 'monthly' | 'yearly';

        const expectedAmount = parseFloat(existingPayment.amount) || (planType === 'monthly' ? 1690 : 5475);
        const paidAmount = parseFloat(webhookData.sum) || 0;
        
        const minAcceptable = expectedAmount * 0.99;
        
        if (paidAmount < minAcceptable) {
          console.error(`Payment amount mismatch for order ${orderNum}: expected ${expectedAmount}, got ${paidAmount}`);
          await storage.updatePaymentStatus(orderNum, 'failed', { 
            ...req.body, 
            error: `Amount mismatch: expected ${expectedAmount}, got ${paidAmount}` 
          });
          return res.status(400).json({ 
            error: "Payment amount does not match expected price",
            expected: expectedAmount,
            received: paidAmount
          });
        }

        await storage.updatePaymentStatus(orderNum, 'success', req.body);

        const prodamusData = existingPayment.prodamusData as any;
        if (prodamusData?.appliedPromoId) {
          try {
            await storage.recordPromocodeUsageForDiscount(prodamusData.appliedPromoId, userId);
            console.log(`Promocode usage recorded for user ${userId}, promoId: ${prodamusData.appliedPromoId}`);
          } catch (promoErr) {
            console.error(`Failed to record promo usage for order ${orderNum}:`, promoErr);
          }
        }

        const daysToAdd = planType === 'yearly' ? 365 : 30;
        const now = new Date();
        const user = await storage.getUser(userId);
        
        let newExpiresAt: Date;
        if (user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now) {
          newExpiresAt = new Date(user.subscriptionExpiresAt);
          newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);
        } else {
          newExpiresAt = new Date(now);
          newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);
        }

        await storage.updateUser(userId, {
          subscriptionTier: planType,
          subscriptionExpiresAt: newExpiresAt
        });

        console.log(`Payment successful for user ${userId}, plan: ${planType}, amount: ${paidAmount}, expires: ${newExpiresAt}`);

        // Fire-and-forget email notification to admin
        sendPaymentNotification({
          userEmail: user?.email || userId,
          userName: user?.firstName || undefined,
          planType,
          amount: String(paidAmount),
          orderId: orderNum,
          expiresAt: newExpiresAt,
        }).catch((err) => console.error("Payment notification email error:", err));
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Payment webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Get payment history for user
  app.get("/api/payments/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const payments = await storage.getPaymentHistory(userId);
      res.json(payments);
    } catch (error: any) {
      console.error("Get payment history error:", error);
      res.status(500).json({ error: "Ошибка при получении истории платежей" });
    }
  });

  // Content Alchemy - Generate content plan
  app.post("/api/content-alchemy/generate-plan", isAuthenticated, async (req: any, res) => {
    try {
      const { daysCount, warmupTarget } = req.body;
      const userId = req.user.id;
      
      if (!daysCount || !warmupTarget) {
        return res.status(400).json({ error: "Заполните все поля" });
      }

      const archetypeResult = await storage.getLatestArchetypeResult(userId);
      const archetype = archetypeResult ? {
        name: archetypeResult.archetypeName,
        description: archetypeResult.archetypeDescription || "",
        recommendations: archetypeResult.recommendations || []
      } : undefined;

      const topics = await generateContentPlan(daysCount, warmupTarget, archetype);
      storage.logUsageEvent(userId, "alchemy").catch(() => {});
      res.json({ topics });
    } catch (error: any) {
      console.error("Generate content plan error:", error);
      res.status(500).json({ error: error.message || "Ошибка генерации плана" });
    }
  });

  // Content Alchemy Plans CRUD
  app.get("/api/content-alchemy-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const plans = await storage.getContentAlchemyPlans(userId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.post("/api/content-alchemy-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, daysCount, warmupTarget, topics } = req.body;

      const plan = await storage.createContentAlchemyPlan({
        userId,
        name,
        daysCount,
        contentType: "mixed",
        warmupTarget,
        topics,
      });

      for (const topic of topics) {
        await storage.createGrimoireTopic({
          userId,
          planId: plan.id,
          day: topic.day,
          topic: topic.topic,
          description: topic.description,
          status: "new",
        });
      }

      res.json(plan);
    } catch (error: any) {
      console.error("Create content alchemy plan error:", error);
      res.status(500).json({ error: error.message || "Ошибка сохранения плана" });
    }
  });

  app.delete("/api/content-alchemy-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = req.params.id;
      await storage.deleteContentAlchemyPlan(planId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete content alchemy plan error:", error);
      res.status(500).json({ error: error.message || "Ошибка удаления плана" });
    }
  });

  // Grimoire Topics CRUD
  app.get("/api/grimoire-topics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const topics = await storage.getGrimoireTopics(userId);
      res.json(topics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch grimoire topics" });
    }
  });

  app.post("/api/grimoire-topics/:id/generate-questions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const topic = await storage.getGrimoireTopic(req.params.id, userId);
      
      if (!topic) {
        return res.status(404).json({ error: "Тема не найдена" });
      }

      const questions = await generateQuestions(topic.topic, topic.description || "");
      
      await storage.updateGrimoireTopic(topic.id, userId, {
        questions,
        status: "in_progress",
      });

      res.json({ questions });
    } catch (error: any) {
      console.error("Generate questions error:", error);
      res.status(500).json({ error: error.message || "Ошибка генерации вопросов" });
    }
  });

  app.post("/api/grimoire-topics/:id/generate-post", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { answers } = req.body;
      const topic = await storage.getGrimoireTopic(req.params.id, userId);
      
      if (!topic) {
        return res.status(404).json({ error: "Тема не найдена" });
      }

      const post = await generatePostFromAnswers(topic.topic, answers);
      
      await storage.updateGrimoireTopic(topic.id, userId, {
        answers,
        generatedPost: post,
        status: "completed",
      });

      res.json({ post });
    } catch (error: any) {
      console.error("Generate post error:", error);
      res.status(500).json({ error: error.message || "Ошибка генерации поста" });
    }
  });

  app.delete("/api/grimoire-topics/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.deleteGrimoireTopic(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete topic" });
    }
  });

  app.post("/api/trigger-reels/transform", isAuthenticated, async (req: any, res) => {
    try {
      const { script } = req.body;

      if (!script || typeof script !== "string" || script.trim().length < 10) {
        return res.status(400).json({ error: "Введите сценарий (минимум 10 символов)" });
      }

      if (script.length > 10000) {
        return res.status(400).json({ error: "Сценарий слишком длинный (максимум 10000 символов)" });
      }

      const userId = req.user.id;
      const access = await storage.hasActiveAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Для использования этой функции нужна активная подписка" });
      }

      const result = await transformToTriggerReels(script.trim());
      storage.logUsageEvent(userId, "triggerReels").catch(() => {});
      res.json(result);
    } catch (error: any) {
      console.error("Trigger Reels transform error:", error);
      res.status(500).json({ error: "Ошибка при обработке сценария. Попробуйте ещё раз." });
    }
  });

  // Threads Generator
  app.post("/api/threads/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { userInput, postsCount } = req.body;

      if (!userInput || typeof userInput !== "string" || userInput.trim().length < 10) {
        return res.status(400).json({ error: "Введите идею или тему (минимум 10 символов)" });
      }

      if (userInput.length > 5000) {
        return res.status(400).json({ error: "Текст слишком длинный (максимум 5000 символов)" });
      }

      if (postsCount !== 3 && postsCount !== 5) {
        return res.status(400).json({ error: "Количество постов должно быть 3 или 5" });
      }

      const userId = req.user.id;
      const access = await storage.hasActiveAccess(userId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Для использования этой функции нужна активная подписка" });
      }

      const posts = await generateThreadsPosts(userInput.trim(), postsCount as 3 | 5);
      storage.logUsageEvent(userId, "threads").catch(() => {});
      res.json({ posts });
    } catch (error: any) {
      console.error("Threads generate error:", error);
      res.status(500).json({ error: error.message || "Ошибка при генерации постов. Попробуйте ещё раз." });
    }
  });

  // Admin - Usage Stats
  app.get("/api/admin/usage-stats", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const period = (req.query.period as string) || "week";
      if (!["day", "week", "month"].includes(period)) {
        return res.status(400).json({ error: "period must be day, week, or month" });
      }
      const stats = await storage.getUsageStats(period as "day" | "week" | "month");
      res.json({ stats });
    } catch (error) {
      console.error("Usage stats error:", error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  return httpServer;
}
