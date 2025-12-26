import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";

const app = express();
const httpServer = createServer(app);

// Try multiple paths to find static files
declare const __dirname: string;
const possiblePaths = [
  path.join(__dirname, "public"),
  path.resolve(process.cwd(), "dist", "public"),
  path.resolve(process.cwd(), "public"),
  path.join(__dirname, "..", "dist", "public"),
  "/home/runner/workspace/dist/public",
];

let publicPath = "";
let indexPath = "";

for (const p of possiblePaths) {
  const idx = path.join(p, "index.html");
  console.log(`[prod] Checking path: ${p}`);
  if (fs.existsSync(idx)) {
    publicPath = p;
    indexPath = idx;
    console.log(`[prod] Found index.html at: ${idx}`);
    break;
  }
}

if (!publicPath) {
  console.error("[prod] ERROR: Could not find public folder!");
  console.error("[prod] __dirname:", __dirname);
  console.error("[prod] process.cwd():", process.cwd());
  console.error("[prod] Tried paths:", possiblePaths);
}

let appReady = false;

// Health check routes
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
});

// Debug endpoint to see paths
app.get("/__debug", (_req, res) => {
  res.json({
    __dirname,
    cwd: process.cwd(),
    publicPath,
    indexPath,
    exists: fs.existsSync(indexPath),
    triedPaths: possiblePaths.map(p => ({
      path: p,
      exists: fs.existsSync(p),
      hasIndex: fs.existsSync(path.join(p, "index.html"))
    }))
  });
});

// Serve static files if path found
if (publicPath) {
  app.use(express.static(publicPath));
}

// SPA fallback
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    if (!appReady) {
      return res.status(503).json({ error: "Server starting..." });
    }
    return next();
  }
  
  if (indexPath && fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback error page with debug info
    res.status(500).send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Error</title></head>
<body>
  <h1>Static files not found</h1>
  <p>__dirname: ${__dirname}</p>
  <p>cwd: ${process.cwd()}</p>
  <p>publicPath: ${publicPath || 'not found'}</p>
  <p>indexPath: ${indexPath || 'not found'}</p>
  <p>Tried paths:</p>
  <ul>
    ${possiblePaths.map(p => `<li>${p} - ${fs.existsSync(p) ? 'exists' : 'missing'}</li>`).join('')}
  </ul>
</body>
</html>
    `);
  }
});

// Start listening
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[prod] Server listening on port ${port}`);
  console.log(`[prod] Serving static from: ${publicPath || 'NOT FOUND'}`);
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
  }
}
