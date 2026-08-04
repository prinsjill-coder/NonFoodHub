import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 4173);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"]
]);

function isInsideRoot(filePath) {
  const resolved = resolve(filePath);
  return resolved === rootDir || resolved.startsWith(`${rootDir}${sep}`);
}

function requestPath(requestUrl = "/") {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const decodedPath = decodeURIComponent(url.pathname);
  const normalizedPath = normalize(decodedPath).replace(/^([/\\])+/, "");
  const filePath = resolve(rootDir, normalizedPath || "index.html");
  return isInsideRoot(filePath) ? filePath : "";
}

async function existingFile(filePath) {
  if (!filePath || !existsSync(filePath)) return "";
  const fileStat = await stat(filePath);
  if (fileStat.isDirectory()) return join(filePath, "index.html");
  return fileStat.isFile() ? filePath : "";
}

const server = createServer(async (request, response) => {
  try {
    const filePath = await existingFile(requestPath(request.url));
    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Niet gevonden");
      return;
    }

    const contentType = contentTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream";
    response.writeHead(200, { "content-type": contentType });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Serverfout");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Non-Food Hub testserver draait op http://127.0.0.1:${port}`);
});
