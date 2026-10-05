import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json" };
const port = Number(process.env.PORT || 4173);
http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requested = path.resolve(root, "." + pathname);
  if (!requested.startsWith(root + path.sep) && requested !== root) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(root, "index.html");
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(404).end("Not found"); return; }
    response.writeHead(200, { "content-type": (mime[path.extname(file)] || "application/octet-stream") + "; charset=utf-8" });
    response.end(content);
  });
}).listen(port, "127.0.0.1", () => console.log("DecisionLab em http://127.0.0.1:" + port));
