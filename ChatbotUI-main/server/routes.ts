import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContentStrategySchema, insertArchetypeResultSchema, insertVoicePostSchema, insertCaseStudySchema, insertSalesTrainerSampleSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, requireAdmin } from "./auth";
import { generateImprovedAnswer } from "./services/moneyTrainer";
import { generateCase, cleanOcrText } from "./services/caseGenerator";
import { generateContentStrategy } from "./services/contentGenerator";

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

  // Generate content strategy using AI
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

  app.post("/api/strategies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check generation limit (don't check for saving, only for generating)
      const parsed = insertContentStrategySchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const strategy = await storage.createContentStrategy(parsed.data);
      
      res.status(201).json(strategy);
    } catch (error) {
      res.status(500).json({ error: "Failed to create strategy" });
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
      const result = await storage.createArchetypeResult(parsed.data);
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
      const caseStudy = await storage.createCaseStudy(parsed.data);
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
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin stats" });
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
        const user = await storage.updateUser(id, { isAdmin: req.body.isAdmin });
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
      const sample = await storage.createSalesTrainerSample(parsed.data);
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

  return httpServer;
}
