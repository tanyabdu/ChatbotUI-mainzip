import express from "express";
import { createServer } from "http";
import path from "path";

const app = express();
const httpServer = createServer(app);

const publicPath = path.resolve(process.cwd(), "dist", "public");
let appReady = false;

// Health check routes - respond immediately
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
});

// Serve static files immediately
app.use(express.static(publicPath));

// SPA fallback - serve index.html for non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    if (!appReady) {
      return res.status(503).json({ error: "Server starting..." });
    }
    return next();
  }
  res.sendFile(path.join(publicPath, "index.html"));
});

// Start listening
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[prod] Server listening on port ${port}`);
  initializeApp();
});

async function initializeApp() {
  try {
    console.log("[prod] Starting app initialization...");
    const startTime = Date.now();
    
    const { initializeApp: init } = await import("./app-init.cjs");
    await init(httpServer, app);
    
    appReady = true;
    const elapsed = Date.now() - startTime;
    console.log(`[prod] App fully initialized in ${elapsed}ms`);
  } catch (err) {
    console.error("[prod] Failed to initialize app:", err);
    process.exit(1);
  }
}
