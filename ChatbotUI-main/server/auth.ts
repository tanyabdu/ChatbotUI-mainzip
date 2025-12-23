import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./services/email";

const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

function generatePassword(length: number = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

function getTokenFromRequest(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

export async function setupAuth(app: Express) {
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
      
      const token = generateToken(user.id);
      
      res.json({ 
        message: "Вход выполнен успешно",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Ошибка при входе" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Выход выполнен успешно" });
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
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(payload.userId);
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
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const accessStatus = await storage.hasActiveAccess(payload.userId);
    res.json(accessStatus);
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const token = getTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Заполните все поля" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Новый пароль должен быть не менее 6 символов" });
      }
      
      const user = await storage.getUser(payload.userId);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const isValidCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidCurrent) {
        return res.status(400).json({ message: "Неверный текущий пароль" });
      }
      
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { passwordHash });
      
      res.json({ message: "Пароль успешно изменён" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Ошибка при смене пароля" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(payload.userId);
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
