import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 4173);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"]
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

async function candidateFile(filePath) {
  if (!filePath || !existsSync(filePath)) return "";
  const fileStat = await stat(filePath);
  if (fileStat.isDirectory()) {
    const indexFile = join(filePath, "index.html");
    if (!existsSync(indexFile)) return "";
    const indexStat = await stat(indexFile);
    return indexStat.isFile() ? indexFile : "";
  }

  return fileStat.isFile() ? filePath : "";
}

async function existingFile(filePath) {
  const directFile = await candidateFile(filePath);
  if (directFile) return directFile;

  if (filePath && !extname(filePath)) {
    return candidateFile(`${filePath}.html`);
  }

  return "";
}

export const server = createServer(async (request, response) => {
  try {
    const method = (request.method || "GET").toUpperCase();
    if (!["GET", "HEAD"].includes(method)) {
      response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      response.end("Methode niet toegestaan");
      return;
    }

    const filePath = await existingFile(requestPath(request.url));
    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Niet gevonden");
      return;
    }

    const contentType = contentTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream";
    response.writeHead(200, { "content-type": contentType });
    if (method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Serverfout");
  }
});

export function startStaticServer({
  host = "127.0.0.1",
  displayHost = host,
  label = "testserver",
  listenPort = port
} = {}) {
  return new Promise((resolveStart, rejectStart) => {
    server.once("error", rejectStart);
    server.listen(listenPort, host, () => {
      server.off("error", rejectStart);
      console.log(`Non-Food Hub ${label} draait op http://${displayHost}:${listenPort}`);
      resolveStart(server);
    });
  });
}

export function closeStaticServer() {
  return new Promise((resolveClose, rejectClose) => {
    if (!server.listening) {
      resolveClose();
      return;
    }

    server.close((error) => {
      if (error) rejectClose(error);
      else resolveClose();
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startStaticServer();
}
