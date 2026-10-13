import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
const root = fileURLToPath(new URL("../../", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
createServer(async (req, res) => {
  try {
    const requested = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file = path.resolve(root, `.${requested}`);
    if (
      !file.startsWith(root) ||
      requested.split("/").some((segment) => segment.startsWith("."))
    ) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (requested === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    let data = await readFile(file);
    const headers = {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    };
    if (
      /\.(html|js|css|json|txt)$/.test(file) &&
      req.headers["accept-encoding"]?.includes("gzip")
    ) {
      data = gzipSync(data);
      headers["Content-Encoding"] = "gzip";
      headers.Vary = "Accept-Encoding";
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Page introuvable");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("Portfolio et démos : http://localhost:4173/creations.html"),
);
