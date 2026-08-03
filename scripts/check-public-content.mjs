import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { projectPublicArticles, PUBLIC_ARTICLE_KEYS } from "../shared/public-articles.js";
import {
  PUBLIC_DATASET_CONFIG,
  PUBLIC_DATASET_ROOT_KEYS,
  PUBLIC_SUPPLIER_PROJECTION_PROPOSAL
} from "../shared/public-content.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ARTICLE_FILE = PUBLIC_DATASET_CONFIG.articles.publicPath;
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
const FORBIDDEN_ITEM_FIELDS = [
  "status",
  "supplierIds",
  "brochureIds",
  "articleIds",
  "relatedArticleIds",
  "featured",
  "sortOrder",
  "governance",
  "readiness",
  "validation",
  "warnings",
  "errors"
];
const FORBIDDEN_PLATFORM_BRANDING = [
  /Bidfood Non-Food Hub/i,
  /Bidfood Non Food Hub/i,
  /Bidfood NonFood Hub/i
];

function readText(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function publicHtmlFiles() {
  return [
    "index.html",
    ...readdirSync(resolve(rootDir, "pages"))
      .filter((fileName) => fileName.endsWith(".html"))
      .map((fileName) => `pages/${fileName}`),
    "assets/js/main.js"
  ];
}

function collectForbiddenKeys(value, forbiddenKeys, path = "$") {
  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenKeys(item, forbiddenKeys, `${path}[${index}]`));
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const currentPath = `${path}.${key}`;
    const ownMatch = forbiddenKeys.has(key) ? [currentPath] : [];
    return [...ownMatch, ...collectForbiddenKeys(nestedValue, forbiddenKeys, currentPath)];
  });
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runPublicContentChecks() {
  const articles = readJson("data/articles.json");
  const publicArticles = readJson(PUBLIC_ARTICLE_FILE);

  await runCheck("publieke datasetstructuur bestaat voor contentprojecties", () => {
    assert.equal(existsSync(resolve(rootDir, "data/public")), true);
    assert.equal(existsSync(resolve(rootDir, PUBLIC_DATASET_CONFIG.articles.sourcePath)), true);
    assert.equal(existsSync(resolve(rootDir, PUBLIC_ARTICLE_FILE)), true);
    assert.equal(existsSync(resolve(rootDir, "data/public-articles.json")), false);
  });

  await runCheck("publieke artikelprojectie is afgeleid van gepubliceerde Studio-artikelen", () => {
    assert.deepEqual(publicArticles, projectPublicArticles(articles));
    assert.ok(publicArticles.items.length > 0);
  });

  await runCheck("publieke artikelprojectie bevat alleen websitevelden", () => {
    FORBIDDEN_ROOT_FIELDS.forEach((field) => {
      assert.equal(field in publicArticles, false, `Verboden rootveld in publieke projectie: ${field}`);
    });
    assert.deepEqual(Object.keys(publicArticles), PUBLIC_DATASET_ROOT_KEYS);

    publicArticles.items.forEach((item) => {
      assert.deepEqual(Object.keys(item), PUBLIC_ARTICLE_KEYS);
      FORBIDDEN_ITEM_FIELDS.forEach((field) => {
        assert.equal(field in item, false, `Verboden itemveld in publieke projectie: ${field}`);
      });
    });
  });

  await runCheck("publieke datasets bevatten geen interne metadata", () => {
    const forbiddenKeys = new Set([...FORBIDDEN_ROOT_FIELDS, ...FORBIDDEN_ITEM_FIELDS]);
    const matches = collectForbiddenKeys(publicArticles, forbiddenKeys);
    assert.deepEqual(matches, [], `Verboden publieke sleutel gevonden: ${matches.join(", ")}`);
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
    assert.match(publicJs, /data\/public\/articles\.json/);
    assert.doesNotMatch(publicJs, /data\/public-articles\.json/);
    assert.doesNotMatch(publicJs, /data\/articles\.json/);
    assert.doesNotMatch(pageHtml, /data\/articles\.json/);
  });

  await runCheck("leveranciersprojectie is voorbereid zonder publieke leveranciersdataset", () => {
    assert.equal(PUBLIC_SUPPLIER_PROJECTION_PROPOSAL.sourcePath, "data/suppliers.json");
    assert.equal(PUBLIC_SUPPLIER_PROJECTION_PROPOSAL.futurePublicPath, "data/public/suppliers.json");
    assert.deepEqual(PUBLIC_SUPPLIER_PROJECTION_PROPOSAL.publicFields, [
      "id",
      "slug",
      "name",
      "type",
      "summary",
      "description",
      "categories",
      "logo",
      "image"
    ]);
    ["status", "governance", "readiness", "sortOrder"].forEach((field) => {
      assert.ok(PUBLIC_SUPPLIER_PROJECTION_PROPOSAL.internalFields.includes(field));
    });
    assert.equal(existsSync(resolve(rootDir, "data/public/suppliers.json")), false);
  });

  await runCheck("publieke website gebruikt Bidfood niet als platformnaam", () => {
    const publicShell = publicHtmlFiles().map(readText).join("\n");
    FORBIDDEN_PLATFORM_BRANDING.forEach((pattern) => {
      assert.equal(pattern.test(publicShell), false, `Verboden platformbranding gevonden: ${pattern}`);
    });
  });

  await runCheck("publieke contentlaag voegt geen opslag of externe integratie toe", () => {
    const changedRuntime = [
      readText("shared/public-content.js"),
      readText("shared/public-articles.js"),
      readText("assets/js/main.js"),
      readText("pages/inspiratie.html")
    ].join("\n");

    assert.doesNotMatch(changedRuntime, /localStorage|sessionStorage|indexedDB|file:\/\/|\/Users\/|\\Users\\|[A-Za-z]:[\\/]+Users[\\/]/i);
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
