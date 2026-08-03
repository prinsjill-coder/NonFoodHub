import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { projectPublicArticles, PUBLIC_ARTICLE_KEYS } from "../shared/public-articles.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ARTICLE_FILE = "data/public-articles.json";
const FORBIDDEN_PUBLIC_TEXT = [
  /Notion/i,
  /bronkaart/i,
  /bronpagina/i,
  /\bbron\b/i,
  /pilot/i,
  /prototype/i,
  /browsergeheugen/i,
  /opslag/i,
  /storage/i,
  /governance/i,
  /readiness/i,
  /GitHub Desktop/i,
  /manual-json-export/i
];
const FORBIDDEN_ROOT_FIELDS = ["schemaVersion", "metadata", "prototype", "storage", "statuses", "categories"];
const FORBIDDEN_ITEM_FIELDS = ["status", "supplierIds", "brochureIds", "sortOrder", "governance", "readiness"];

function readText(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runPublicContentChecks() {
  const articles = readJson("data/articles.json");
  const publicArticles = readJson(PUBLIC_ARTICLE_FILE);

  await runCheck("publieke artikelprojectie is afgeleid van gepubliceerde Studio-artikelen", () => {
    assert.deepEqual(publicArticles, projectPublicArticles(articles));
    assert.ok(publicArticles.items.length > 0);
  });

  await runCheck("publieke artikelprojectie bevat alleen websitevelden", () => {
    FORBIDDEN_ROOT_FIELDS.forEach((field) => {
      assert.equal(field in publicArticles, false, `Verboden rootveld in publieke projectie: ${field}`);
    });
    assert.deepEqual(Object.keys(publicArticles), ["items"]);

    publicArticles.items.forEach((item) => {
      assert.deepEqual(Object.keys(item), PUBLIC_ARTICLE_KEYS);
      FORBIDDEN_ITEM_FIELDS.forEach((field) => {
        assert.equal(field in item, false, `Verboden itemveld in publieke projectie: ${field}`);
      });
    });
  });

  await runCheck("publieke artikelprojectie bevat geen interne of prototype-taal", () => {
    const content = JSON.stringify(publicArticles);
    FORBIDDEN_PUBLIC_TEXT.forEach((pattern) => {
      assert.equal(pattern.test(content), false, `Verboden publieke tekst gevonden: ${pattern}`);
    });
  });

  await runCheck("inspiratiepagina gebruikt publieke projectie in plaats van ruwe Studio-data", () => {
    const pageHtml = readText("pages/inspiratie.html");
    const publicJs = readText("assets/js/main.js");

    assert.match(pageHtml, /data-public-article-grid/);
    assert.match(pageHtml, /data-public-article-body/);
    assert.match(publicJs, /data\/public-articles\.json/);
    assert.doesNotMatch(publicJs, /data\/articles\.json/);
    assert.doesNotMatch(pageHtml, /data\/articles\.json/);
  });

  await runCheck("publieke contentlaag voegt geen opslag of externe integratie toe", () => {
    const changedRuntime = [
      readText("shared/public-articles.js"),
      readText("assets/js/main.js"),
      readText("pages/inspiratie.html")
    ].join("\n");

    assert.doesNotMatch(changedRuntime, /localStorage|sessionStorage|indexedDB|file:\/\/|\/Users\/|[A-Za-z]:\\Users\\/i);
    assert.doesNotMatch(changedRuntime, /api\.github|Octokit|XMLHttpRequest|sendBeacon|backend|database/i);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPublicContentChecks()
    .then(() => {
      console.log("Public content checks voltooid.");
    })
    .catch((error) => {
      console.error(`Public content checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
