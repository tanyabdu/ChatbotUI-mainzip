const express = require("express");
const { createServer } = require("http");

const app = express();
const httpServer = createServer(app);

app.get("/", (req: any, res: any) => {
  const userAgent = req.headers["user-agent"] || "";
  if (userAgent.includes("Mozilla") || userAgent.includes("Chrome") || userAgent.includes("Safari")) {
    return res.redirect("/app");
  }
  res.status(200).send("OK");
});

app.get("/health", (_req: any, res: any) => {
  res.status(200).json({ status: "ok" });
});

app.get("/__healthcheck", (_req: any, res: any) => {
  res.status(200).send("OK");
});

const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
  console.log(`[prod] Health check ready on port ${port}`);
  
  setImmediate(async () => {
    try {
      const { initializeApp } = require("./app-init.cjs");
      await initializeApp(httpServer, app);
      console.log("[prod] Full application initialized");
    } catch (err) {
      console.error("[prod] Failed to initialize app:", err);
    }
  });
});
