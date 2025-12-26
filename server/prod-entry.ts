import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { markReady } from "./readiness";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

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
}

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/__healthcheck", (_req, res) => {
  res.status(200).send("OK");
});

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

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      console.log(`${formattedTime} [express] ${logLine}`);
    }
  });

  next();
});

async function initializeRoutes() {
  try {
    console.log("[prod] Importing routes...");
    const { registerRoutes } = await import("./routes");
    await registerRoutes(httpServer, app);
    console.log("[prod] Routes registered");
  } catch (err) {
    console.error("[prod] Failed to register routes:", err);
  }
}

if (publicPath) {
  app.use(express.static(publicPath));
}

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  
  if (indexPath && fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Error</title></head>
<body>
  <h1>Static files not found</h1>
  <p>__dirname: ${__dirname}</p>
  <p>cwd: ${process.cwd()}</p>
  <p>publicPath: ${publicPath || 'not found'}</p>
  <p>Tried paths:</p>
  <ul>
    ${possiblePaths.map(p => `<li>${p} - ${fs.existsSync(p) ? 'exists' : 'missing'}</li>`).join('')}
  </ul>
</body>
</html>
    `);
  }
});

const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(port, "0.0.0.0", async () => {
  console.log(`[prod] Server listening on port ${port}`);
  console.log(`[prod] Serving static from: ${publicPath || 'NOT FOUND'}`);
  
  await initializeRoutes();
  markReady();
  console.log("[prod] App fully initialized");
});
