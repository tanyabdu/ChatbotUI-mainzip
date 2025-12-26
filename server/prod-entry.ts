import express from "express";
import { createServer } from "http";
import path from "path";

const app = express();
const httpServer = createServer(app);

let appReady = false;

// Health check routes - respond immediately with minimal overhead
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
});

// Temporary placeholder for ALL routes until app is ready
// This avoids disk I/O from static file serving during startup
app.use((req, res, next) => {
  if (appReady) {
    return next();
  }
  
  // API routes get 503 until ready
  if (req.path.startsWith("/api")) {
    return res.status(503).json({ error: "Server starting..." });
  }
  
  // Root and all other routes get minimal HTML response
  res.status(200).send("<!DOCTYPE html><html><head><meta charset='utf-8'><title>Loading...</title></head><body>Starting...</body></html>");
});

// Start listening IMMEDIATELY - before any disk I/O
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[prod] Server listening on port ${port}`);
  
  // Initialize app asynchronously AFTER we're already listening
  initializeApp();
});

async function initializeApp() {
  try {
    console.log("[prod] Starting async app initialization...");
    const startTime = Date.now();
    
    // Mount static files AFTER init starts (not blocking health checks)
    const publicPath = path.resolve(process.cwd(), "dist", "public");
    app.use(express.static(publicPath));
    
    // SPA fallback for client-side routing
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(publicPath, "index.html"));
    });
    
    // Initialize full app (routes, database, etc)
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
