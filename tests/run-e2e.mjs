import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { closeStaticServer, startStaticServer } from "./serve-static.mjs";

const port = Number(process.env.PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const playwrightCli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));

async function canReach(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function runPlaywright(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [playwrightCli, "test", ...args], {
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: baseURL,
        PLAYWRIGHT_SKIP_WEBSERVER: "1"
      },
      stdio: "inherit"
    });

    child.on("error", rejectRun);
    child.on("exit", (code) => resolveRun(code ?? 1));
  });
}

let startedServer = false;
let exitCode = 1;

try {
  if (!(await canReach(`${baseURL}/index.html`))) {
    await startStaticServer({ listenPort: port });
    startedServer = true;
  }

  exitCode = await runPlaywright(process.argv.slice(2));
} finally {
  if (startedServer) await closeStaticServer();
}

process.exitCode = exitCode;
