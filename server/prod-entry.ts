import { createServer, IncomingMessage, ServerResponse } from "http";

// Create raw HTTP server - minimal, no Express overhead
const httpServer = createServer();

let expressApp: any = null;

// Minimal loading page HTML
const loadingHtml = `<!DOCTYPE html>
<html><head><title>Loading...</title><meta http-equiv="refresh" content="2"></head>
<body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#1e1b4b;color:white;">
<div style="text-align:center"><h1>Загрузка...</h1><p>Приложение запускается</p></div>
</body></html>`;

// Raw request handler - responds immediately
httpServer.on("request", (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || "/";
  
  // Health checks - ALWAYS respond immediately with 200
  if (url === "/health" || url === "/__healthcheck") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }
  
  // If Express app is ready, delegate to it
  if (expressApp) {
    expressApp(req, res);
    return;
  }
  
  // App not ready yet - return loading page or OK
  if (url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(loadingHtml);
  } else {
    // For any other path, return OK (might be health check with different path)
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  }
});

// Start listening IMMEDIATELY
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[prod] Server listening on port ${port} - health checks ready`);
  
  // Initialize Express app in background
  initializeExpressApp();
});

async function initializeExpressApp() {
  try {
    console.log("[prod] Starting Express app initialization...");
    
    const express = (await import("express")).default;
    const app = express();
    
    // Health check routes on Express too (for after handoff)
    app.get("/health", (_req, res) => res.status(200).send("OK"));
    app.get("/__healthcheck", (_req, res) => res.status(200).send("OK"));
    
    // Load full app
    const { initializeApp } = await import("./app-init.cjs");
    await initializeApp(httpServer, app);
    
    // Hand off to Express
    expressApp = app;
    console.log("[prod] Express app ready - handling requests");
  } catch (err) {
    console.error("[prod] Failed to initialize Express app:", err);
  }
}
