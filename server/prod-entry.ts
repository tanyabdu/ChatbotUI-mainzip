import express from "express";
import { createServer } from "http";
import { isReady } from "./readiness";

const app = express();
const httpServer = createServer(app);

app.use((req, res, next) => {
  if (req.path === "/health" || req.path === "/__healthcheck") {
    return res.status(200).json({ status: "ok", ready: isReady() });
  }
  
  if (req.path === "/" && req.method === "GET") {
    if (!isReady()) {
      return res.status(200).send("OK");
    }
  }
  
  next();
});

const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[prod] Health check ready on port ${port}`);
  
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
