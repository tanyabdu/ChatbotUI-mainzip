import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Pre-load index.html into memory for faster responses
  const indexPath = path.resolve(distPath, "index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf-8");

  // Static middleware - index: false to let main server handle /
  app.use(express.static(distPath, { maxAge: "1d", index: false }));

  // fall through to index.html if the file doesn't exist
  // Send from memory for faster health check responses
  app.use("*", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(indexHtml);
  });
}
