import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContentStrategySchema, insertArchetypeResultSchema, insertVoicePostSchema, insertCaseStudySchema, insertSalesTrainerSampleSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateImprovedAnswer } from "./services/moneyTrainer";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const strategies = await storage.getContentStrategies(userId);
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategies" });
    }
  });

  app.get("/api/strategies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const limit = await storage.canGenerateStrategy(userId);
      res.json(limit);
    } catch (error) {
      res.status(500).json({ error: "Failed to check generation limit" });
    }
  });

  app.post("/api/strategies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check generation limit
      const limitCheck = await storage.canGenerateStrategy(userId);
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.reason, limitReached: true });
      }
      
      const parsed = insertContentStrategySchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const strategy = await storage.createContentStrategy(parsed.data);
      
      // Increment daily generation count
      await storage.incrementDailyGeneration(userId);
      
      res.status(201).json(strategy);
    } catch (error) {
      res.status(500).json({ error: "Failed to create strategy" });
    }
  });

  app.delete("/api/strategies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteContentStrategy(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete strategy" });
    }
  });

  // Archetype Results (protected routes)
  app.get("/api/archetypes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const results = await storage.getArchetypeResults(userId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch archetype results" });
    }
  });

  app.get("/api/archetypes/latest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await storage.getLatestArchetypeResult(userId);
      res.json(result || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest archetype result" });
    }
  });

  app.post("/api/archetypes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const posts = await storage.getVoicePosts(userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch voice posts" });
    }
  });

  app.post("/api/voice-posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      await storage.deleteVoicePost(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete voice post" });
    }
  });

  // Case Studies (protected routes)
  app.get("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      await storage.deleteCaseStudy(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete case study" });
    }
  });

  // Admin Routes
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
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
      const userId = req.user.claims.sub;
      const sessions = await storage.getSalesTrainerSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trainer sessions" });
    }
  });

  app.post("/api/trainer/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  return httpServer;
}
