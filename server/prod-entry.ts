import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// Health check routes - defined first, respond immediately
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
});

async function startServer() {
  console.log("[prod] Starting server initialization...");
  const startTime = Date.now();
  
  // Initialize app (routes, middleware, static files)
  const { initializeApp } = await import("./app-init.cjs");
  await initializeApp(httpServer, app);
  
  const elapsed = Date.now() - startTime;
  console.log(`[prod] App initialized in ${elapsed}ms`);
  
  // Start listening after initialization is complete
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`[prod] Server ready on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("[prod] Failed to start server:", err);
  process.exit(1);
});
