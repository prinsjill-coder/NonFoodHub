import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { projectPublicArticles, PUBLIC_ARTICLE_KEYS } from "../shared/public-articles.js";
import { projectPublicSuppliers, PUBLIC_SUPPLIER_KEYS } from "../shared/public-suppliers.js";
import {
  PUBLIC_DATASET_CONFIG,
  PUBLIC_DATASET_ROOT_KEYS
} from "../shared/public-content.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ARTICLE_FILE = PUBLIC_DATASET_CONFIG.articles.publicPath;
const PUBLIC_SUPPLIER_FILE = PUBLIC_DATASET_CONFIG.suppliers.publicPath;
const FORBIDDEN_PUBLIC_TEXT = [
  /Notion/i,
  /bronkaart/i,
  /bronpagina/i,
  /\bbron\b/i,
  /\bdemo\b/i,
  /demo-record/i,
  /Demo-leverancier/i,
  /pilot/i,
  /prototype/i,
  /\bStudio\b/i,
  /browsergeheugen/i,
  /website nog niet/i,
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
const PUBLIC_SUPPLIER_REFERENCE_KEYS = ["id", "slug", "name"];
const PUBLIC_RELATED_ARTICLE_KEYS = ["id", "slug", "title", "summary", "category", "heroImage", "updatedAt"];

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

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runPublicContentChecks() {
  const articles = readJson("data/articles.json");
  const suppliers = readJson("data/suppliers.json");
  const publicArticles = readJson(PUBLIC_ARTICLE_FILE);
  const publicSuppliers = readJson(PUBLIC_SUPPLIER_FILE);
  const publicDatasets = [publicArticles, publicSuppliers];

  await runCheck("publieke datasetstructuur bestaat voor contentprojecties", () => {
    assert.equal(existsSync(resolve(rootDir, "data/public")), true);
    Object.values(PUBLIC_DATASET_CONFIG).forEach((config) => {
      assert.equal(existsSync(resolve(rootDir, config.sourcePath)), true, `Brondata ontbreekt: ${config.sourcePath}`);
      assert.equal(existsSync(resolve(rootDir, config.publicPath)), true, `Publieke dataset ontbreekt: ${config.publicPath}`);
    });
    assert.equal(existsSync(resolve(rootDir, "data/public-articles.json")), false);
  });

  await runCheck("publieke artikelprojectie is afgeleid van gepubliceerde Studio-artikelen", () => {
    assert.deepEqual(publicArticles, projectPublicArticles(articles, suppliers));
    assert.ok(publicArticles.items.length > 0);
  });

  await runCheck("publieke leveranciersprojectie is afgeleid van gepubliceerde Studio-leveranciers", () => {
    assert.deepEqual(publicSuppliers, projectPublicSuppliers(suppliers, articles));
    assert.ok(publicSuppliers.items.length > 0);
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

  await runCheck("publieke leveranciersprojectie bevat alleen websitevelden", () => {
    FORBIDDEN_ROOT_FIELDS.forEach((field) => {
      assert.equal(field in publicSuppliers, false, `Verboden rootveld in publieke leveranciersprojectie: ${field}`);
    });
    assert.deepEqual(Object.keys(publicSuppliers), PUBLIC_DATASET_ROOT_KEYS);

    publicSuppliers.items.forEach((item) => {
      assert.deepEqual(Object.keys(item), PUBLIC_SUPPLIER_KEYS);
      FORBIDDEN_ITEM_FIELDS.forEach((field) => {
        assert.equal(field in item, false, `Verboden itemveld in publieke leveranciersprojectie: ${field}`);
      });
    });
  });

  await runCheck("publieke relaties verwijzen alleen naar bestaande publieke items", () => {
    const suppliersById = byId(publicSuppliers.items);
    const articlesById = byId(publicArticles.items);

    publicArticles.items.forEach((article) => {
      assert.equal(Array.isArray(article.suppliers), true, `Artikel ${article.id} mist publieke leverancierslijst.`);
      article.suppliers.forEach((supplier) => {
        assert.deepEqual(Object.keys(supplier), PUBLIC_SUPPLIER_REFERENCE_KEYS);
        const publicSupplier = suppliersById.get(supplier.id);
        assert.ok(publicSupplier, `Artikel ${article.id} verwijst naar niet-publieke leverancier ${supplier.id}.`);
        assert.equal(supplier.slug, publicSupplier.slug);
        assert.equal(supplier.name, publicSupplier.name);
      });
    });

    publicSuppliers.items.forEach((supplier) => {
      assert.equal(Array.isArray(supplier.relatedArticles), true, `Leverancier ${supplier.id} mist publieke artikellijst.`);
      supplier.relatedArticles.forEach((article) => {
        assert.deepEqual(Object.keys(article), PUBLIC_RELATED_ARTICLE_KEYS);
        const publicArticle = articlesById.get(article.id);
        assert.ok(publicArticle, `Leverancier ${supplier.id} verwijst naar niet-publiek artikel ${article.id}.`);
        assert.equal(article.slug, publicArticle.slug);
        assert.equal(article.title, publicArticle.title);
        assert.ok(
          publicArticle.suppliers.some((articleSupplier) => articleSupplier.id === supplier.id),
          `Relatie tussen ${supplier.id} en ${article.id} is niet wederkerig in publieke projecties.`
        );
      });
    });
  });

  await runCheck("publieke datasets bevatten geen interne metadata", () => {
    const forbiddenKeys = new Set(FORBIDDEN_ITEM_FIELDS);
    const matches = publicDatasets.flatMap((dataset) => collectForbiddenKeys(dataset.items, forbiddenKeys, "$.items"));
    assert.deepEqual(matches, [], `Verboden publieke sleutel gevonden: ${matches.join(", ")}`);
  });

  await runCheck("publieke datasets bevatten geen interne of prototype-taal", () => {
    const content = JSON.stringify(publicDatasets);
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

  await runCheck("leverancierspagina gebruikt publieke projectie in plaats van ruwe Studio-data", () => {
    const pageHtml = readText("pages/leveranciers.html");
    const publicJs = readText("assets/js/main.js");

    assert.match(pageHtml, /data-public-supplier-grid/);
    assert.match(pageHtml, /data-public-supplier-detail/);
    assert.match(publicJs, /data\/public\/suppliers\.json/);
    assert.doesNotMatch(publicJs, /data\/suppliers\.json/);
    assert.doesNotMatch(pageHtml, /data\/suppliers\.json/);
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
      readText("shared/public-suppliers.js"),
      readText("assets/js/main.js"),
      readText("pages/inspiratie.html"),
      readText("pages/leveranciers.html")
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
