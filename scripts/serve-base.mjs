import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve("dist");
const prefix = "/demo";
const port = 4322;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    let path = decodeURIComponent((request.url || "/").split("?")[0]);
    if (path.startsWith(prefix)) path = path.slice(prefix.length) || "/";
    if (path === "/") path = "/index.html";
    let file = join(root, path);
    try {
      const info = await stat(file);
      if (info.isDirectory()) file = join(file, "index.html");
    } catch {
      file = join(root, "404.html");
    }
    const body = await readFile(file);
    response.writeHead(file.endsWith("404.html") ? 404 : 200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(500);
    response.end("Server error");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} under ${prefix} at http://127.0.0.1:${port}${prefix}/`);
});
