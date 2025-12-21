import bcrypt from "bcryptjs";
import crypto from "crypto";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./services/email";

function generatePassword(length: number = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  
  const host = process.env.EXTERNAL_DB_HOST;
  const port = process.env.EXTERNAL_DB_PORT;
  const database = process.env.EXTERNAL_DB_NAME;
  const user = process.env.EXTERNAL_DB_USER;
  const password = process.env.EXTERNAL_DB_PASSWORD;
  const connectionString = `postgresql://${user}:${encodeURIComponent(password!)}@${host}:${port}/${database}`;
  
  const sessionStore = new pgStore({
    conString: connectionString,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    schemaName: "esoteric_planner",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      
      if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "Введите корректный email" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Пользователь с таким email уже существует" });
      }
      
      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);
      
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 3);
      
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        subscriptionTier: "trial",
        trialEndsAt,
      });
      
      await sendWelcomeEmail(email, password);
      
      res.status(201).json({ 
        message: "Регистрация успешна! Проверьте почту для получения пароля.",
        userId: user.id 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Ошибка при регистрации" });
    }
  });
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Введите email и пароль" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }
      
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }
      
      await storage.updateUser(user.id, { lastLoginAt: new Date() });
      
      (req.session as any).userId = user.id;
      
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Ошибка при сохранении сессии" });
        }
        
        res.json({ 
          message: "Вход выполнен успешно",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
          }
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Ошибка при входе" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Ошибка при выходе" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Выход выполнен успешно" });
    });
  });
  
  app.post("/api/auth/password-reset/request", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Введите email" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "Если email существует, вам будет отправлена ссылка для сброса пароля" });
      }
      
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(token, 10);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });
      
      const baseUrl = process.env.APP_URL || `https://${req.hostname}`;
      const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      
      await sendPasswordResetEmail(email, resetLink);
      
      res.json({ message: "Если email существует, вам будет отправлена ссылка для сброса пароля" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Ошибка при запросе сброса пароля" });
    }
  });
  
  app.post("/api/auth/password-reset/confirm", async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;
      
      if (!email || !token || !newPassword) {
        return res.status(400).json({ message: "Заполните все поля" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Пароль должен быть не менее 6 символов" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Недействительная ссылка для сброса пароля" });
      }
      
      const resetToken = await storage.getValidPasswordResetToken(user.id);
      if (!resetToken) {
        return res.status(400).json({ message: "Ссылка для сброса пароля истекла или уже использована" });
      }
      
      const isValidToken = await bcrypt.compare(token, resetToken.tokenHash);
      if (!isValidToken) {
        return res.status(400).json({ message: "Недействительная ссылка для сброса пароля" });
      }
      
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { passwordHash });
      await storage.markPasswordResetTokenUsed(resetToken.id);
      
      res.json({ message: "Пароль успешно изменён" });
    } catch (error) {
      console.error("Password reset confirm error:", error);
      res.status(500).json({ message: "Ошибка при сбросе пароля" });
    }
  });
  
  app.get("/api/auth/user", async (req, res) => {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      isAdmin: user.isAdmin,
      subscriptionTier: user.subscriptionTier,
      trialEndsAt: user.trialEndsAt,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    });
  });
  
  app.get("/api/auth/access", async (req, res) => {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const accessStatus = await storage.hasActiveAccess(userId);
    res.json(accessStatus);
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any).userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  (req as any).user = user;
  next();
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;
  
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  next();
};
