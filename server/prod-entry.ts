import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";

console.log("[prod] Starting server...");
console.log("[prod] NODE_ENV:", process.env.NODE_ENV);
console.log("[prod] PORT:", process.env.PORT);

const app = express();
const httpServer = createServer(app);

const possiblePaths = [
  path.join(__dirname, "public"),
  path.resolve(process.cwd(), "dist", "public"),
  path.resolve(process.cwd(), "public"),
  "/home/runner/workspace/dist/public",
];

let publicPath = "";
let indexPath = "";

console.log("[prod] __dirname:", __dirname);
console.log("[prod] process.cwd():", process.cwd());

for (const p of possiblePaths) {
  const idx = path.join(p, "index.html");
  console.log(`[prod] Checking path: ${p}`);
  try {
    if (fs.existsSync(idx)) {
      publicPath = p;
      indexPath = idx;
      console.log(`[prod] Found index.html at: ${idx}`);
      break;
    }
  } catch (e) {
    console.log(`[prod] Error checking ${p}:`, e);
  }
}

if (!publicPath) {
  console.error("[prod] ERROR: Could not find public folder!");
}

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__debug", (_req, res) => {
  res.json({
    status: "running",
    __dirname,
    cwd: process.cwd(),
    publicPath,
    indexPath,
    nodeVersion: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    },
    triedPaths: possiblePaths.map(p => ({
      path: p,
      exists: fs.existsSync(p),
      hasIndex: fs.existsSync(path.join(p, "index.html"))
    }))
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (publicPath) {
  console.log("[prod] Setting up static file serving from:", publicPath);
  app.use(express.static(publicPath));
}

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(503).json({ error: "API not initialized yet - minimal test mode" });
  }
  
  if (indexPath && fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Diagnostic</title></head>
<body>
  <h1>Server is running but static files not found</h1>
  <p>This is a diagnostic page from prod-entry.ts</p>
  <p>__dirname: ${__dirname}</p>
  <p>cwd: ${process.cwd()}</p>
  <p>publicPath: ${publicPath || 'not found'}</p>
  <p>Tried paths:</p>
  <ul>
    ${possiblePaths.map(p => {
      try {
        return `<li>${p} - ${fs.existsSync(p) ? 'exists' : 'missing'}</li>`;
      } catch {
        return `<li>${p} - error checking</li>`;
      }
    }).join('')}
  </ul>
</body>
</html>
    `);
  }
});

const port = parseInt(process.env.PORT || "5000", 10);
console.log(`[prod] About to listen on port ${port}...`);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[prod] Server listening on port ${port}`);
  console.log(`[prod] Serving static from: ${publicPath || 'NOT FOUND'}`);
  console.log("[prod] Minimal server started successfully!");
});

httpServer.on("error", (err) => {
  console.error("[prod] Server error:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[prod] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[prod] Unhandled rejection at:", promise, "reason:", reason);
});
