import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  GOVERNANCE_MODULE_IDS,
  getContentGovernanceReport
} from "../shared/content-governance.js";
import {
  CONTENT_READINESS_LABELS,
  CONTENT_READINESS_STATUSES,
  findReadinessByRoute,
  getContentReadinessReport
} from "../shared/content-readiness.js";
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

function assertNoPattern({ roots, files = [], pattern, label }) {
  const rootFiles = roots.flatMap((root) => filesIn(root));
  const explicitFiles = files.map((file) => resolve(rootDir, file));
  const matches = [...rootFiles, ...explicitFiles]
    .filter((file, index, allFiles) => allFiles.indexOf(file) === index)
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) => file.replace(`${rootDir}\\`, "").replace(`${rootDir}/`, ""));

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

function fixtureData() {
  return {
    suppliers: {
      items: [
        {
          id: "supplier-ready",
          slug: "supplier-ready",
          name: "Supplier Ready"
        }
      ]
    },
    brochures: {
      items: [
        {
          id: "brochure-review",
          slug: "brochure-review",
          title: "Brochure Review"
        }
      ]
    },
    articles: {
      items: [
        {
          id: "article-attention",
          slug: "article-attention",
          title: "Article Attention"
        }
      ]
    },
    media: { items: [] },
    library: { items: [] }
  };
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runContentReadinessChecks() {
  const suppliers = readJson("data/suppliers.json");
  const brochures = readJson("data/brochures.json");
  const media = readJson("data/media.json");
  const articles = readJson("data/articles.json");
  const library = readJson("data/library.json");
  const data = { suppliers, brochures, media, articles, library };

  await runCheck("readiness helper en component bestaan", () => {
    assert.equal(existsSync(resolve(rootDir, "shared/content-readiness.js")), true);
    assert.equal(existsSync(resolve(rootDir, "components/readiness-card.js")), true);
  });

  await runCheck("readiness gebruikt alle governance modules", () => {
    const governanceReport = getContentGovernanceReport(data);
    const report = getContentReadinessReport(data, { governanceReport });

    assert.deepEqual(report.modules.map((module) => module.id), GOVERNANCE_MODULE_IDS);
    assert.equal(report.totals.moduleCount, GOVERNANCE_MODULE_IDS.length);
    assert.equal(report.totals.totalItems, report.modules.reduce((sum, module) => sum + module.total, 0));
    assert.equal(
      report.totals.totalItems,
      report.totals.ready + report.totals.review + report.totals.needs_attention
    );
  });

  await runCheck("readiness items hebben uniforme structuur", () => {
    const governanceReport = getContentGovernanceReport(data);
    const report = getContentReadinessReport(data, { governanceReport });

    report.modules.forEach((module) => {
      assert.equal(module.total, module.items.length);
      assert.equal(module.total, module.ready + module.review + module.needs_attention);
      module.items.forEach((item) => {
        assert.equal(item.module, module.id);
        assert.equal(typeof item.moduleLabel, "string");
        assert.equal(typeof item.itemId, "string");
        assert.equal(typeof item.itemLabel, "string");
        assert.match(item.targetRoute, /^#\//);
        assert.ok(CONTENT_READINESS_STATUSES.includes(item.status), `Onbekende readiness status: ${item.status}`);
        assert.equal(item.label, CONTENT_READINESS_LABELS[item.status]);
        assert.equal(typeof item.score, "number");
        assert.ok(item.score >= 0 && item.score <= 100);
        assert.ok(Array.isArray(item.issues));
        assert.ok(Array.isArray(item.reasons));
      });
    });
  });

  await runCheck("readiness is afgeleid van bestaande governance issues", () => {
    const governanceReport = getContentGovernanceReport(data);
    const report = getContentReadinessReport(data, { governanceReport });
    const governanceKeys = new Set(
      governanceReport.issues.map((issue) => [issue.module, issue.targetRoute, issue.type, issue.message].join("|"))
    );

    report.modules.flatMap((module) => module.items).forEach((item) => {
      item.issues.forEach((issue) => {
        assert.equal(issue.targetRoute, item.targetRoute);
        assert.ok(
          governanceKeys.has([issue.module, issue.targetRoute, issue.type, issue.message].join("|")),
          `Readiness issue bestaat niet in governance: ${issue.message}`
        );
      });
      assert.deepEqual(
        item.reasons,
        item.issues.map((issue) => issue.message)
      );
    });
  });

  await runCheck("readiness vertaalt bestaande signalen naar drie statussen", () => {
    const samples = fixtureData();
    const report = getContentReadinessReport(samples, {
      governanceReport: {
        issues: [
          {
            module: "brochures",
            severity: "warning",
            type: "relationship",
            message: "Reviewsignaal",
            targetRoute: "#/brochures/brochure-review"
          },
          {
            module: "articles",
            severity: "warning",
            type: "missing-file",
            message: "Belangrijk signaal",
            targetRoute: "#/kennisbank/article-attention"
          }
        ]
      }
    });

    assert.equal(findReadinessByRoute(report, "suppliers", "#/leveranciers/supplier-ready").status, "ready");
    assert.equal(findReadinessByRoute(report, "brochures", "#/brochures/brochure-review").status, "review");
    assert.equal(findReadinessByRoute(report, "articles", "#/kennisbank/article-attention").status, "needs_attention");
  });

  await runCheck("readiness routes blijven bestaande read-only Studio-routes", () => {
    const report = getContentReadinessReport(data);
    const forbiddenActionRoute = /\/(?:nieuw|import|export)$|\/bewerken$/;

    report.modules.flatMap((module) => module.items).forEach((item) => {
      const route = routeFromHash(item.targetRoute);
      assert.notEqual(route.id, "notFound", `Ongeldige readiness-route: ${item.targetRoute}`);
      assert.equal(route.enabled, true, `Readiness-route is niet actief: ${item.targetRoute}`);
      assert.doesNotMatch(item.targetRoute, forbiddenActionRoute, `Readiness-route mag geen actieformulier zijn: ${item.targetRoute}`);
    });
  });

  await runCheck("governance en detailpagina's tonen readiness read-only", () => {
    const state = createState(data);
    const detailRoutes = [
      "#/leveranciers/amefa",
      "#/brochures/amefa-for-professionals-2026",
      "#/media/media-brochures-overview",
      "#/kennisbank/terras-outdoor-inspiratie",
      "#/bibliotheek/churchill-combined-brochure-2026"
    ];
    const governanceHtml = renderRoute(routeFromHash("#/governance"), state);

    assert.match(governanceHtml, /Klaar/);
    assert.match(governanceHtml, /Review nodig/);
    assert.match(governanceHtml, /Aandacht nodig/);
    assert.doesNotMatch(governanceHtml, /data-readiness-form|readiness.*bewerken/i);

    detailRoutes.forEach((targetRoute) => {
      const html = renderRoute(routeFromHash(targetRoute), state);
      assert.match(html, /Content readiness/);
      assert.match(html, /Score \d+\/100/);
      assert.doesNotMatch(html, /data-readiness-form|readiness.*bewerken/i);
    });
  });

  await runCheck("readiness voegt geen opslag, backend of nieuwe validatielaag toe", () => {
    assertNoPattern({
      roots: [],
      files: ["shared/content-readiness.js", "components/readiness-card.js"],
      pattern: /localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|api\.github|Octokit|download|createObjectURL|writeFile|appendFile|setItem|removeItem/i,
      label: "Readiness mag geen opslag-, download- of integratiegedrag bevatten"
    });
    assertNoPattern({
      roots: [],
      files: ["shared/content-readiness.js"],
      pattern: /validation|file-validation|validate[A-Z]|\brun[A-Z].*Checks\b/,
      label: "Readiness mag geen validators of checklaag importeren"
    });
    assertNoPattern({
      roots: [],
      files: [
        "shared/content-readiness.js",
        "components/readiness-card.js",
        "studio/js/pages/governance.js",
        "studio/js/pages/suppliers/detail.js",
        "studio/js/pages/brochures/detail.js",
        "studio/js/pages/media/detail.js",
        "studio/js/pages/knowledge/detail.js",
        "studio/js/pages/library/detail.js",
        "studio/css/studio.css"
      ],
      pattern: /\/Users\/|file:\/\/|[A-Za-z]:\\Users\\/i,
      label: "Readiness mag geen Mac-, file-url- of absolute gebruikerspaden bevatten"
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runContentReadinessChecks()
    .then(() => {
      console.log("Content readiness checks voltooid.");
    })
    .catch((error) => {
      console.error(`Content readiness checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
