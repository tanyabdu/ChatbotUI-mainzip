import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.get("/", (req, res) => {
  const userAgent = req.headers["user-agent"] || "";
  if (userAgent.includes("Mozilla") || userAgent.includes("Chrome") || userAgent.includes("Safari")) {
    return res.redirect("/app");
  }
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
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
