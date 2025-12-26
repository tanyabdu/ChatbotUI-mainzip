import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

let appInitialized = false;

// CRITICAL: Health check routes respond IMMEDIATELY - no waiting
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
});

// Root endpoint - ALWAYS responds immediately
// After app is initialized, it will serve the real app
app.get("/", (req, res, next) => {
  if (appInitialized) {
    // App is ready, let the static handler serve the real page
    return next();
  }
  // App still loading - respond with a simple loading page
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>Loading...</title><meta http-equiv="refresh" content="2"></head>
<body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#1e1b4b;color:white;">
<div style="text-align:center">
<h1>Загрузка приложения...</h1>
<p>Обновление через 2 секунды</p>
</div>
</body>
</html>`);
});

// Start listening IMMEDIATELY so health checks pass
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[prod] Server listening on port ${port}, health checks ready`);
  
  // Initialize the rest of the app AFTER server is listening
  setImmediate(async () => {
    try {
      const { initializeApp } = await import("./app-init.cjs");
      await initializeApp(httpServer, app);
      appInitialized = true;
      console.log("[prod] Full application initialized");
    } catch (err) {
      console.error("[prod] Failed to initialize app:", err);
    }
  });
});
