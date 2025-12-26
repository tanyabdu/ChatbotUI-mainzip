import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// CRITICAL: Health check routes MUST be defined FIRST as explicit routes
// These respond immediately without any middleware processing
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
});

// Root endpoint for health checks - must respond immediately
app.get("/", (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  // For browsers, let the static handler deal with it later
  if (userAgent.includes("Mozilla") || userAgent.includes("Chrome") || userAgent.includes("Safari")) {
    return next();
  }
  // For health checkers (no user agent or curl), respond immediately
  res.status(200).send("OK");
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
      console.log("[prod] Full application initialized");
    } catch (err) {
      console.error("[prod] Failed to initialize app:", err);
    }
  });
});
