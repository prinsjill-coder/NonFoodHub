import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  GOVERNANCE_MODULE_IDS,
  getContentGovernanceReport
} from "../shared/content-governance.js";
import { routeFromHash } from "../shared/routes.js";
import { createArticleSession } from "../studio/js/state/article-session.js";
import { createBrochureSession } from "../studio/js/state/brochure-session.js";
import { createLibrarySession } from "../studio/js/state/library-session.js";
import { createMediaSession } from "../studio/js/state/media-session.js";
import { createSupplierSession } from "../studio/js/state/supplier-session.js";
import { renderRoute } from "../studio/js/router.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

function filesIn(relativePath, extensions = new Set([".js", ".mjs", ".json"])) {
  const start = resolve(rootDir, relativePath);
  const found = [];

  function walk(path) {
    const stats = statSync(path);
    if (stats.isDirectory()) {
      readdirSync(path).forEach((entry) => walk(resolve(path, entry)));
      return;
    }

    if (extensions.has(extname(path))) {
      found.push(path);
    }
  }

  walk(start);
  return found;
}

function assertNoPattern({ roots, pattern, label }) {
  const matches = [];
  roots.flatMap((root) => filesIn(root)).forEach((file) => {
    const content = readFileSync(file, "utf8");
    if (pattern.test(content)) {
      matches.push(file.replace(`${rootDir}/`, ""));
    }
  });

  assert.deepEqual(matches, [], `${label}: ${matches.join(", ")}`);
}

function createState({ suppliers, brochures, media, articles, library }) {
  const supplierSession = createSupplierSession(suppliers);
  const brochureSession = createBrochureSession(brochures, () => supplierSession.getWorkingData());
  const mediaSession = createMediaSession(media);
  const articleSession = createArticleSession(
    articles,
    () => supplierSession.getWorkingData(),
    () => brochureSession.getWorkingData(),
    () => mediaSession.getWorkingData()
  );
  const librarySession = createLibrarySession(library, {
    suppliers: () => supplierSession.getWorkingData(),
    brochures: () => brochureSession.getWorkingData(),
    articles: () => articleSession.getWorkingData(),
    media: () => mediaSession.getWorkingData()
  });

  return {
    dashboard: readJson("data/studio-dashboard.json"),
    supplierSession,
    brochureSession,
    mediaSession,
    articleSession,
    librarySession
  };
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runContentGovernanceChecks() {
  const suppliers = readJson("data/suppliers.json");
  const brochures = readJson("data/brochures.json");
  const media = readJson("data/media.json");
  const articles = readJson("data/articles.json");
  const library = readJson("data/library.json");

  await runCheck("governance helper neemt alle bestaande modules mee", () => {
    const report = getContentGovernanceReport({ suppliers, brochures, media, articles, library });
    const moduleIds = report.modules.map((module) => module.id);

    assert.deepEqual(moduleIds, GOVERNANCE_MODULE_IDS);
    assert.equal(report.totals.moduleCount, 5);
    assert.equal(report.totals.totalItems, report.modules.reduce((sum, module) => sum + module.total, 0));
    assert.equal(typeof report.totals.warnings, "number");
    assert.equal(typeof report.totals.blockers, "number");
  });

  await runCheck("governance gebruikt bestaande validatie- en qualitysignalen", () => {
    const report = getContentGovernanceReport({ suppliers, brochures, media, articles, library });
    const suppliersModule = report.modules.find((module) => module.id === "suppliers");
    const brochuresModule = report.modules.find((module) => module.id === "brochures");
    const articlesModule = report.modules.find((module) => module.id === "articles");
    const mediaModule = report.modules.find((module) => module.id === "media");
    const libraryModule = report.modules.find((module) => module.id === "library");

    assert.equal(suppliersModule.total, suppliers.items.length);
    assert.equal(brochuresModule.total, brochures.items.length);
    assert.equal(articlesModule.total, articles.items.length);
    assert.equal(mediaModule.total, media.items.length);
    assert.equal(libraryModule.total, library.items.length);
    assert.ok(libraryModule.missingFiles > 0);
    assert.ok(mediaModule.usageSignals >= 0);
    assert.ok(articlesModule.missingMedia >= 0);
  });

  await runCheck("governanceroute en dashboardkoppeling bestaan", () => {
    const navigation = readJson("data/studio-navigation.json");
    const dashboard = readJson("data/studio-dashboard.json");

    assert.equal(routeFromHash("#/governance").id, "governance");
    assert.equal(routeFromHash("#/governance").sectionId, "governance");
    assert.equal(navigation.items.find((item) => item.id === "governance")?.enabled, true);
    assert.equal(navigation.items.find((item) => item.id === "governance")?.route, "#/governance");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "governanceAttention")?.state, "not_connected");
    assert.equal(dashboard.quickActions.find((action) => action.id === "openGovernance")?.route, "#/governance");
  });

  await runCheck("governancepagina rendert read-only overzicht", () => {
    const state = createState({ suppliers, brochures, media, articles, library });
    const html = renderRoute(routeFromHash("#/governance"), state);

    assert.match(html, /Content Governance/);
    assert.match(html, /Read-only overzicht/);
    assert.match(html, /Leveranciers/);
    assert.match(html, /Brochures/);
    assert.match(html, /Kennisbank/);
    assert.match(html, /Media/);
    assert.match(html, /Bibliotheek/);
    assert.doesNotMatch(html, /is nog niet actief|Pagina niet gevonden/);
  });

  await runCheck("governance voegt geen opslag, backend of GitHub-integratie toe", () => {
    assertNoPattern({
      roots: ["shared", "studio", "data"],
      pattern: /localStorage|sessionStorage|indexedDB|api\.github|Octokit/i,
      label: "Verboden opslag- of integratiepatroon gevonden"
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runContentGovernanceChecks()
    .then(() => {
      console.log("Content governance checks voltooid.");
    })
    .catch((error) => {
      console.error(`Content governance checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
