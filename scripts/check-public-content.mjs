import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { projectPublicArticles, PUBLIC_ARTICLE_KEYS } from "../shared/public-articles.js";
import {
  projectPublicBrochures,
  PUBLIC_BROCHURE_KEYS,
  PUBLIC_BROCHURE_OPTIONAL_KEYS
} from "../shared/public-brochures.js";
import { projectPublicSuppliers, PUBLIC_SUPPLIER_KEYS } from "../shared/public-suppliers.js";
import {
  PUBLIC_DATASET_CONFIG,
  PUBLIC_DATASET_ROOT_KEYS,
  isPublicContentItem
} from "../shared/public-content.js";
import {
  createPublicContentOutputs,
  createPublicDownloadChecker,
  stringifyPublicContentOutputs,
  writePublicContentFiles
} from "./generate-public-content.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isPublicDownload = createPublicDownloadChecker(rootDir);
const PUBLIC_ARTICLE_FILE = PUBLIC_DATASET_CONFIG.articles.publicPath;
const PUBLIC_BROCHURE_FILE = PUBLIC_DATASET_CONFIG.brochures.publicPath;
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
const PUBLIC_RELATED_BROCHURE_KEYS = ["id", "slug", "title", "summary", "categories", "thumbnail", "updatedAt"];

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

function outputByKey(outputs, key) {
  return outputs.find((output) => output.key === key)?.data;
}

function isRelativeProjectPath(value) {
  if (!value) return false;
  return (
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.startsWith("~") &&
    !value.startsWith("file://") &&
    !/^[a-zA-Z]:[\\/]/.test(value) &&
    !value.includes("/Users/") &&
    !value.includes("\\Users\\") &&
    !value.includes("/home/") &&
    !value.includes("\\home\\")
  );
}

function publicFileExists(relativePath) {
  return isRelativeProjectPath(relativePath) && existsSync(resolve(rootDir, relativePath));
}

function assertKeys(item, requiredKeys, optionalKeys = []) {
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const keys = Object.keys(item);
  const unexpectedKeys = keys.filter((key) => !allowedKeys.has(key));
  const missingKeys = requiredKeys.filter((key) => !(key in item));

  assert.deepEqual(unexpectedKeys, [], `Onverwachte publieke velden: ${unexpectedKeys.join(", ")}`);
  assert.deepEqual(missingKeys, [], `Ontbrekende publieke velden: ${missingKeys.join(", ")}`);
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runPublicContentChecks() {
  const articles = readJson("data/articles.json");
  const brochures = readJson("data/brochures.json");
  const suppliers = readJson("data/suppliers.json");
  const publicArticles = readJson(PUBLIC_ARTICLE_FILE);
  const publicBrochures = readJson(PUBLIC_BROCHURE_FILE);
  const publicSuppliers = readJson(PUBLIC_SUPPLIER_FILE);
  const publicDatasets = [publicArticles, publicBrochures, publicSuppliers];

  await runCheck("publieke datasetstructuur bestaat voor contentprojecties", () => {
    assert.equal(existsSync(resolve(rootDir, "data/public")), true);
    Object.values(PUBLIC_DATASET_CONFIG).forEach((config) => {
      assert.equal(existsSync(resolve(rootDir, config.sourcePath)), true, `Brondata ontbreekt: ${config.sourcePath}`);
      assert.equal(existsSync(resolve(rootDir, config.publicPath)), true, `Publieke dataset ontbreekt: ${config.publicPath}`);
    });
    assert.equal(existsSync(resolve(rootDir, "data/public-articles.json")), false);
  });

  await runCheck("centrale publieke-projectiegenerator is aangesloten", () => {
    const packageJson = readJson("package.json");
    const generatorScript = readText("scripts/generate-public-content.mjs");

    assert.equal(packageJson.scripts["generate:public"], "node scripts/generate-public-content.mjs");
    assert.match(generatorScript, /projectPublicArticles/);
    assert.match(generatorScript, /projectPublicSuppliers/);
    assert.match(generatorScript, /projectPublicBrochures/);
    assert.match(generatorScript, /validateArticleFile/);
    assert.match(generatorScript, /validateSupplierFile/);
    assert.match(generatorScript, /validateBrochureFile/);
    assert.match(generatorScript, /PUBLIC_DATASET_CONFIG/);
    assert.doesNotMatch(generatorScript, /localStorage|sessionStorage|indexedDB|fetch\(|api\.github|Octokit/i);
  });

  await runCheck("publieke projectiegenerator levert dezelfde output als data/public", () => {
    const outputs = createPublicContentOutputs({ articles, suppliers, brochures }, { isPublicDownload });
    const outputPaths = outputs.map((output) => output.path);

    Object.values(PUBLIC_DATASET_CONFIG).forEach((config) => {
      assert.ok(outputPaths.includes(config.publicPath), `Generator mist publieke output: ${config.publicPath}`);
    });
    assert.deepEqual(outputByKey(outputs, "articles"), publicArticles);
    assert.deepEqual(outputByKey(outputs, "suppliers"), publicSuppliers);
    assert.deepEqual(outputByKey(outputs, "brochures"), publicBrochures);
  });

  await runCheck("publieke projectiegenerator filtert beheerstatussen per module", () => {
    const outputs = createPublicContentOutputs({ articles, suppliers, brochures }, { isPublicDownload });
    const generatedArticles = outputByKey(outputs, "articles");
    const generatedSuppliers = outputByKey(outputs, "suppliers");
    const generatedBrochures = outputByKey(outputs, "brochures");
    const articleIds = new Set(generatedArticles.items.map((item) => item.id));
    const supplierIds = new Set(generatedSuppliers.items.map((item) => item.id));
    const brochureIds = new Set(generatedBrochures.items.map((item) => item.id));

    assert.ok(supplierIds.has("supplier-amefa"), "Amefa moet behouden blijven in de publieke leveranciersprojectie.");
    assert.equal(
      suppliers.items.find((supplier) => supplier.id === "supplier-churchill")?.status,
      "published",
      "Churchill moet in de beheerdata published zijn voor deze RC1K-validatie."
    );
    assert.ok(supplierIds.has("supplier-churchill"), "Churchill moet na generatie publiek zichtbaar zijn.");

    suppliers.items.forEach((supplier) => {
      assert.equal(
        supplierIds.has(supplier.id),
        isPublicContentItem(supplier),
        `Leveranciersstatusfilter klopt niet voor ${supplier.id}.`
      );
    });
    articles.items.forEach((article) => {
      assert.equal(articleIds.has(article.id), isPublicContentItem(article), `Artikelstatusfilter klopt niet voor ${article.id}.`);
    });
    brochures.items.forEach((brochure) => {
      const expectedPublic = isPublicContentItem(brochure) && supplierIds.has(brochure.supplierId);
      assert.equal(brochureIds.has(brochure.id), expectedPublic, `Brochurestatusfilter klopt niet voor ${brochure.id}.`);
    });
  });

  await runCheck("publieke projectiegenerator is deterministisch", () => {
    const firstRun = stringifyPublicContentOutputs(
      createPublicContentOutputs({ articles, suppliers, brochures }, { isPublicDownload })
    ).map(({ path, content }) => ({ path, content }));
    const secondRun = stringifyPublicContentOutputs(
      createPublicContentOutputs({ articles, suppliers, brochures }, { isPublicDownload })
    ).map(({ path, content }) => ({ path, content }));

    assert.deepEqual(secondRun, firstRun);
  });

  await runCheck("publieke projectiegenerator stopt bij ongeldige brondata zonder gedeeltelijke writes", () => {
    const invalidSuppliers = {
      ...suppliers,
      items: suppliers.items.map((supplier, index) => (index === 0 ? { ...supplier, id: "" } : supplier))
    };
    let writeCount = 0;

    assert.throws(
      () =>
        writePublicContentFiles({
          rootDir,
          sources: { articles, suppliers: invalidSuppliers, brochures },
          writeFile: () => {
            writeCount += 1;
          }
        }),
      /Publieke contentprojectie niet gegenereerd/
    );
    assert.equal(writeCount, 0);
  });

  await runCheck("publieke artikelprojectie is afgeleid van gepubliceerde Studio-artikelen", () => {
    assert.deepEqual(publicArticles, projectPublicArticles(articles, suppliers));
    assert.ok(publicArticles.items.length >= 2);
    assert.ok(publicArticles.items.every((article) => article.suppliers.length > 0));
  });

  await runCheck("publieke leveranciersprojectie is afgeleid van gepubliceerde Studio-leveranciers", () => {
    assert.deepEqual(publicSuppliers, projectPublicSuppliers(suppliers, articles, brochures, { isPublicDownload }));
    assert.ok(publicSuppliers.items.length > 0);
  });

  await runCheck("publieke brochureprojectie is afgeleid van gepubliceerde Studio-brochures", () => {
    assert.deepEqual(publicBrochures, projectPublicBrochures(brochures, suppliers, { isPublicDownload }));
    assert.ok(publicBrochures.items.length > 0);
  });

  await runCheck("publieke artikelprojectie bevat alleen websitevelden", () => {
    FORBIDDEN_ROOT_FIELDS.forEach((field) => {
      assert.equal(field in publicArticles, false, `Verboden rootveld in publieke projectie: ${field}`);
    });
    assert.deepEqual(Object.keys(publicArticles), PUBLIC_DATASET_ROOT_KEYS);

    publicArticles.items.forEach((item) => {
      assertKeys(item, PUBLIC_ARTICLE_KEYS);
      FORBIDDEN_ITEM_FIELDS.forEach((field) => {
        assert.equal(field in item, false, `Verboden itemveld in publieke projectie: ${field}`);
      });
    });
  });

  await runCheck("publieke brochureprojectie bevat alleen websitevelden", () => {
    FORBIDDEN_ROOT_FIELDS.forEach((field) => {
      assert.equal(field in publicBrochures, false, `Verboden rootveld in publieke brochureprojectie: ${field}`);
    });
    assert.deepEqual(Object.keys(publicBrochures), PUBLIC_DATASET_ROOT_KEYS);

    publicBrochures.items.forEach((item) => {
      assertKeys(item, PUBLIC_BROCHURE_KEYS, PUBLIC_BROCHURE_OPTIONAL_KEYS);
      assert.equal(Array.isArray(item.categories), true, `Publieke brochure ${item.id} mist categorieen-array.`);
      assert.equal("category" in item, false, `Publieke brochure ${item.id} gebruikt nog een enkele categorie.`);
      FORBIDDEN_ITEM_FIELDS.forEach((field) => {
        assert.equal(field in item, false, `Verboden itemveld in publieke brochureprojectie: ${field}`);
      });
    });
  });

  await runCheck("publieke leveranciersprojectie bevat alleen websitevelden", () => {
    FORBIDDEN_ROOT_FIELDS.forEach((field) => {
      assert.equal(field in publicSuppliers, false, `Verboden rootveld in publieke leveranciersprojectie: ${field}`);
    });
    assert.deepEqual(Object.keys(publicSuppliers), PUBLIC_DATASET_ROOT_KEYS);

    publicSuppliers.items.forEach((item) => {
      assertKeys(item, PUBLIC_SUPPLIER_KEYS);
      FORBIDDEN_ITEM_FIELDS.forEach((field) => {
        assert.equal(field in item, false, `Verboden itemveld in publieke leveranciersprojectie: ${field}`);
      });
    });
  });

  await runCheck("publieke relaties verwijzen alleen naar bestaande publieke items", () => {
    const suppliersById = byId(publicSuppliers.items);
    const articlesById = byId(publicArticles.items);
    const brochuresById = byId(publicBrochures.items);

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
        assertKeys(article, PUBLIC_RELATED_ARTICLE_KEYS);
        const publicArticle = articlesById.get(article.id);
        assert.ok(publicArticle, `Leverancier ${supplier.id} verwijst naar niet-publiek artikel ${article.id}.`);
        assert.equal(article.slug, publicArticle.slug);
        assert.equal(article.title, publicArticle.title);
        assert.ok(
          publicArticle.suppliers.some((articleSupplier) => articleSupplier.id === supplier.id),
          `Relatie tussen ${supplier.id} en ${article.id} is niet wederkerig in publieke projecties.`
        );
      });

      assert.equal(Array.isArray(supplier.relatedBrochures), true, `Leverancier ${supplier.id} mist publieke brochurelijst.`);
      supplier.relatedBrochures.forEach((brochure) => {
        assertKeys(brochure, PUBLIC_RELATED_BROCHURE_KEYS, PUBLIC_BROCHURE_OPTIONAL_KEYS);
        assert.equal(Array.isArray(brochure.categories), true, `Gerelateerde brochure ${brochure.id} mist categorieen-array.`);
        assert.equal("category" in brochure, false, `Gerelateerde brochure ${brochure.id} gebruikt nog een enkele categorie.`);
        const publicBrochure = brochuresById.get(brochure.id);
        assert.ok(publicBrochure, `Leverancier ${supplier.id} verwijst naar niet-publieke brochure ${brochure.id}.`);
        assert.equal(publicBrochure.supplierId, supplier.id);
        assert.equal(brochure.slug, publicBrochure.slug);
        assert.equal(brochure.title, publicBrochure.title);
      });
    });

    publicBrochures.items.forEach((brochure) => {
      const publicSupplier = suppliersById.get(brochure.supplierId);
      assert.ok(publicSupplier, `Brochure ${brochure.id} verwijst naar niet-publieke leverancier ${brochure.supplierId}.`);
      assert.ok(
        publicSupplier.relatedBrochures.some((relatedBrochure) => relatedBrochure.id === brochure.id),
        `Relatie tussen ${brochure.supplierId} en ${brochure.id} is niet wederkerig in publieke projecties.`
      );
    });
  });

  await runCheck("publieke downloadlinks bestaan alleen voor valide PDF-bestanden", () => {
    [...publicBrochures.items, ...publicSuppliers.items.flatMap((supplier) => supplier.relatedBrochures)].forEach((item) => {
      if (!("downloadUrl" in item)) return;
      assert.equal(isPublicDownload(item.downloadUrl), true, `Ongeldige publieke downloadlink: ${item.downloadUrl}`);
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

  await runCheck("homepage gebruikt publieke projecties als ontdeklaag", () => {
    const pageHtml = readText("index.html");
    const publicJs = readText("assets/js/main.js");

    assert.match(pageHtml, /data-home-article-grid/);
    assert.match(pageHtml, /data-home-supplier-grid/);
    assert.match(pageHtml, /data-home-brochure-grid/);
    assert.match(pageHtml, /data-home-count="articles"/);
    assert.match(pageHtml, /data-home-count="suppliers"/);
    assert.match(pageHtml, /data-home-count="brochures"/);
    assert.match(pageHtml, /\.\.\/images\/hero\.png/);
    assert.match(publicJs, /setupHomepageDiscovery/);
    assert.match(publicJs, /updateHomepageCount/);
    assert.match(publicJs, /data\/public\/articles\.json/);
    assert.match(publicJs, /data\/public\/suppliers\.json/);
    assert.match(publicJs, /data\/public\/brochures\.json/);
    assert.match(publicJs, /linkToArticlePage/);
    assert.match(publicJs, /articlePageLink/);
    assert.match(publicJs, /linkToSupplierPage/);
    assert.match(publicJs, /linkToBrochurePage/);
    assert.match(publicJs, /Geen inspiratie beschikbaar/);
    assert.match(publicJs, /Geen leveranciers beschikbaar/);
    assert.match(publicJs, /Geen brochures beschikbaar/);
    assert.doesNotMatch(pageHtml, /data\/articles\.json|data\/suppliers\.json|data\/brochures\.json/);
    assert.doesNotMatch(publicJs, /fetch\(href\("data\/articles\.json"|fetch\(href\("data\/suppliers\.json"|fetch\(href\("data\/brochures\.json"/);
  });

  await runCheck("inspiratiepagina gebruikt publieke projectie in plaats van ruwe Studio-data", () => {
    const pageHtml = readText("pages/inspiratie.html");
    const publicJs = readText("assets/js/main.js");

    assert.match(pageHtml, /data-public-article-overview/);
    assert.match(pageHtml, /data-public-article-grid/);
    assert.match(pageHtml, /data-public-article-detail-section/);
    assert.match(pageHtml, /data-public-article-body/);
    assert.match(publicJs, /data\/public\/articles\.json/);
    assert.match(publicJs, /selectedHashSlug/);
    assert.match(publicJs, /renderArticleState/);
    assert.doesNotMatch(publicJs, /data\/public-articles\.json/);
    assert.doesNotMatch(publicJs, /data\/articles\.json/);
    assert.doesNotMatch(pageHtml, /data\/articles\.json/);
  });

  await runCheck("leverancierspagina gebruikt publieke projectie in plaats van ruwe Studio-data", () => {
    const pageHtml = readText("pages/leveranciers.html");
    const publicJs = readText("assets/js/main.js");

    assert.match(pageHtml, /data-public-supplier-overview/);
    assert.match(pageHtml, /data-public-supplier-grid/);
    assert.match(pageHtml, /data-public-supplier-detail-section/);
    assert.match(pageHtml, /data-public-supplier-detail/);
    assert.match(pageHtml, /data-public-supplier-extra/);
    assert.match(publicJs, /data\/public\/suppliers\.json/);
    assert.match(publicJs, /renderSupplierState/);
    assert.doesNotMatch(publicJs, /data\/suppliers\.json/);
    assert.doesNotMatch(pageHtml, /data\/suppliers\.json/);
  });

  await runCheck("brochurepagina gebruikt publieke projectie in plaats van ruwe Studio-data", () => {
    const pageHtml = readText("pages/brochures-catalogi.html");
    const publicJs = readText("assets/js/main.js");

    assert.match(pageHtml, /data-public-brochure-intro/);
    assert.match(pageHtml, /data-public-brochure-overview/);
    assert.match(pageHtml, /data-public-brochure-grid/);
    assert.match(pageHtml, /data-public-brochure-detail-section/);
    assert.match(pageHtml, /data-public-brochure-detail/);
    assert.match(publicJs, /data\/public\/brochures\.json/);
    assert.match(publicJs, /renderBrochureState/);
    assert.match(publicJs, /renderPublicBrochureDetail/);
    assert.doesNotMatch(publicJs, /data\/brochures\.json/);
    assert.doesNotMatch(pageHtml, /data\/brochures\.json/);
  });

  await runCheck("publieke detailflow gebruikt consistente hashroutes en breadcrumbs", () => {
    const publicJs = readText("assets/js/main.js");
    const publicCss = readText("assets/css/styles.css");

    assert.match(publicJs, /renderDetailBreadcrumb/);
    assert.match(publicJs, /Terug naar inspiratie/);
    assert.match(publicJs, /Terug naar leveranciers/);
    assert.match(publicJs, /Terug naar brochures/);
    assert.match(publicJs, /updateDocumentTitle/);
    assert.match(publicJs, /body\.classList\.add\("is-detail-route"\)/);
    assert.match(publicJs, /window\.addEventListener\("hashchange"/);
    assert.match(publicCss, /body\.is-detail-route/);
    assert.match(publicCss, /\.detail-breadcrumb/);
    assert.match(publicCss, /\.detail-status/);
    assert.match(publicCss, /\.card-link:hover/);
    assert.match(publicCss, /\.contact-card a:not\(\.btn\)/);
  });

  await runCheck("publieke navigatie en filters hebben toegankelijke states", () => {
    const publicJs = readText("assets/js/main.js");
    const publicCss = readText("assets/css/styles.css");
    const brochurePageHtml = readText("pages/brochures-catalogi.html");
    const publicShell = publicHtmlFiles().map(readText).join("\n");

    assert.match(publicShell, /aria-current="page"/);
    assert.match(brochurePageHtml, /role="group" aria-label="Filter brochures op categorie"/);
    assert.match(brochurePageHtml, /aria-pressed="true"/);
    assert.match(publicJs, /aria-current="page"/);
    assert.match(publicJs, /aria-controls="mobile-navigation"/);
    assert.match(publicJs, /aria-hidden="true"/);
    assert.match(publicJs, /aria-controls="site-search-overlay"/);
    assert.match(publicJs, /setSearchExpanded/);
    assert.match(publicJs, /aria-pressed/);
    assert.match(publicJs, /aria-expanded/);
    assert.match(publicCss, /\.mobile-panel a:focus-visible/);
    assert.match(publicCss, /body\.nav-open \.mobile-panel/);
    assert.match(publicCss, /visibility: hidden/);
    assert.match(publicCss, /pointer-events: none/);
  });

  await runCheck("publieke leveranciersdetailpagina koppelt relaties via bestaande websitepagina's", () => {
    const supplierPageHtml = readText("pages/leveranciers.html");
    const inspirationPageHtml = readText("pages/inspiratie.html");
    const brochurePageHtml = readText("pages/brochures-catalogi.html");
    const publicJs = readText("assets/js/main.js");

    assert.equal(existsSync(resolve(rootDir, "pages/leveranciers.html")), true);
    assert.equal(existsSync(resolve(rootDir, "pages/inspiratie.html")), true);
    assert.equal(existsSync(resolve(rootDir, "pages/brochures-catalogi.html")), true);
    assert.match(supplierPageHtml, /data-public-supplier-detail/);
    assert.match(inspirationPageHtml, /data-public-article-body/);
    assert.match(brochurePageHtml, /data-public-brochure-grid/);
    assert.match(publicJs, /function supplierPageLink/);
    assert.match(publicJs, /renderArticleSupplierLinks/);
    assert.match(publicJs, /renderSupplierRelatedArticles/);
    assert.match(publicJs, /renderSupplierRelatedBrochures/);
    assert.match(publicJs, /pages\/leveranciers\.html/);
    assert.match(publicJs, /pages\/inspiratie\.html/);
    assert.match(publicJs, /pages\/brochures-catalogi\.html/);
    assert.match(publicJs, /linkToBrochurePage/);
    assert.doesNotMatch(publicJs, /data\/suppliers\.json|data\/articles\.json|data\/brochures\.json/);
    assert.doesNotMatch(
      [supplierPageHtml, inspirationPageHtml, brochurePageHtml].join("\n"),
      /data\/suppliers\.json|data\/articles\.json|data\/brochures\.json/
    );
  });

  await runCheck("lokale browseracceptatie is voorbereid zonder CI of publicatieflow", () => {
    const packageJson = readJson("package.json");
    const config = readText("playwright.config.mjs");
    const publicSpec = readText("tests/public-demo-flow.spec.mjs");
    const studioSpec = readText("tests/studio-smoke.spec.mjs");
    const e2eRunner = readText("tests/run-e2e.mjs");
    const staticServer = readText("tests/serve-static.mjs");
    const testReadme = readText("tests/README.md");

    assert.equal(packageJson.scripts["test:e2e"], "node tests/run-e2e.mjs");
    assert.equal(packageJson.scripts["test:e2e:report"], "playwright show-report");
    assert.match(config, /webServer/);
    assert.match(config, /PLAYWRIGHT_SKIP_WEBSERVER/);
    assert.match(config, /tests\/serve-static\.mjs/);
    assert.match(config, /name: "desktop"/);
    assert.match(config, /name: "tablet"/);
    assert.match(config, /name: "mobile"/);
    assert.match(publicSpec, /data-home-article-grid/);
    assert.match(publicSpec, /data-public-article-overview/);
    assert.match(publicSpec, /data-public-supplier-overview/);
    assert.match(publicSpec, /data-public-supplier-extra/);
    assert.match(publicSpec, /data-public-brochure-intro/);
    assert.match(publicSpec, /data-public-brochure-overview/);
    assert.match(publicSpec, /toHaveCSS\("color", "rgb\(255, 255, 255\)"\)/);
    assert.match(publicSpec, /overzicht en detail blijven gescheiden/);
    assert.match(publicSpec, /waitForLoadState\("networkidle", \{ timeout: 3000 \}\)/);
    assert.match(studioSpec, /#\/dashboard/);
    assert.match(studioSpec, /#\/governance/);
    assert.match(studioSpec, /#\/leveranciers/);
    assert.match(studioSpec, /#\/brochures/);
    assert.match(studioSpec, /#\/kennisbank/);
    assert.match(studioSpec, /#\/bibliotheek/);
    assert.match(e2eRunner, /startStaticServer/);
    assert.match(e2eRunner, /closeStaticServer/);
    assert.match(e2eRunner, /PLAYWRIGHT_SKIP_WEBSERVER/);
    assert.match(staticServer, /export function startStaticServer/);
    assert.match(staticServer, /export function closeStaticServer/);
    assert.match(testReadme, /npm install/);
    assert.match(testReadme, /npx playwright install/);
    assert.doesNotMatch(
      [config, publicSpec, studioSpec, e2eRunner, staticServer, testReadme].join("\n"),
      /\.github|workflows|deploy|publicatieknop|cms-framework|database|backend|api\.github|Octokit/i
    );
  });

  await runCheck("publieke website gebruikt Bidfood niet als platformnaam", () => {
    const publicShell = publicHtmlFiles().map(readText).join("\n");
    FORBIDDEN_PLATFORM_BRANDING.forEach((pattern) => {
      assert.equal(pattern.test(publicShell), false, `Verboden platformbranding gevonden: ${pattern}`);
    });
  });

  await runCheck("publieke website toont geen prototype- of implementatietaal", () => {
    const publicShell = publicHtmlFiles().map(readText).join("\n");
    [
      /prototype/i,
      /\bdemo\b/i,
      /demo-record/i,
      /\btodo\b/i,
      /\btest\b/i,
      /placeholdertekst/i,
      /Notion/i,
      /pilot/i,
      /voorbeeld/i,
      /Fase 1 statische website/i,
      /centrale publieke projecties/i,
      /publieke contentlaag/i,
      /\bgepubliceerde\b/i,
      /\bpublieke\b/i
    ].forEach((pattern) => {
      assert.equal(pattern.test(publicShell), false, `Ongewenste publieke presentatietaal gevonden: ${pattern}`);
    });
  });

  await runCheck("publieke hero-afbeeldingen verwijzen naar bestaande assets", () => {
    const publicShell = publicHtmlFiles().map(readText).join("\n");

    assert.doesNotMatch(publicShell, /url\('\.\.\/\.\.\/images\//);
    assert.match(readText("index.html"), /--hero-image: url\('\.\.\/images\/hero\.png'\)/);
    [
      ["pages/inspiratie.html", "../images/inspiration.png", "assets/images/inspiration.png"],
      ["pages/leveranciers.html", "../images/assortment.png", "assets/images/assortment.png"],
      ["pages/brochures-catalogi.html", "../images/brochures.png", "assets/images/brochures.png"],
      ["pages/virtuele-showroom.html", "../images/showroom.png", "assets/images/showroom.png"],
      ["pages/terras-outdoor.html", "../images/blog-terrace.png", "assets/images/blog-terrace.png"],
      ["pages/nieuw.html", "../images/new.png", "assets/images/new.png"],
      ["pages/logos-personalisatie.html", "../images/personalisation.png", "assets/images/personalisation.png"],
      ["pages/bibliotheek.html", "../images/library.png", "assets/images/library.png"],
      ["pages/aanbiedingen.html", "../images/offers.png", "assets/images/offers.png"],
      ["pages/droogijs.html", "../images/dryice.png", "assets/images/dryice.png"]
    ].forEach(([pagePath, publicReference, imagePath]) => {
      assert.match(readText(pagePath), new RegExp(publicReference.replaceAll("/", "\\/")));
      assert.equal(publicFileExists(imagePath), true, `Hero-afbeelding ontbreekt: ${imagePath}`);
    });
  });

  await runCheck("publieke contentlaag voegt geen opslag of externe integratie toe", () => {
    const changedRuntime = [
      readText("shared/public-content.js"),
      readText("shared/public-articles.js"),
      readText("shared/public-brochures.js"),
      readText("shared/public-suppliers.js"),
      readText("assets/js/main.js"),
      readText("index.html"),
      readText("pages/inspiratie.html"),
      readText("pages/leveranciers.html"),
      readText("pages/brochures-catalogi.html")
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
