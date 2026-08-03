import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  GOVERNANCE_ISSUE_SEVERITIES,
  GOVERNANCE_MODULE_IDS,
  getContentGovernanceReport
} from "../shared/content-governance.js";
import { routeFromHash } from "../shared/routes.js";
import { createArticleSession } from "../studio/js/state/article-session.js";
import { createBrochureSession } from "../studio/js/state/brochure-session.js";
import { createLibrarySession } from "../studio/js/state/library-session.js";
import { createMediaSession } from "../studio/js/state/media-session.js";
import { createSupplierSession } from "../studio/js/state/supplier-session.js";
import { setupGovernancePage } from "../studio/js/pages/governance.js";
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

function assertNoPatternInFiles({ files, pattern, label }) {
  const matches = files.filter((file) => pattern.test(readFileSync(resolve(rootDir, file), "utf8")));

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

function createGovernanceFilterDom() {
  const mediaCount = { textContent: "" };
  const libraryCount = { textContent: "" };
  const emptyState = { hidden: true };
  const activeSeverity = { textContent: "" };
  const activeModule = { textContent: "" };
  const rows = [
    { dataset: { module: "media", severity: "warning" }, hidden: false },
    { dataset: { module: "media", severity: "error" }, hidden: false },
    { dataset: { module: "library", severity: "warning" }, hidden: false }
  ];
  const groups = [
    {
      dataset: { module: "media" },
      hidden: false,
      querySelector(selector) {
        return selector === "[data-governance-group-count]" ? mediaCount : null;
      }
    },
    {
      dataset: { module: "library" },
      hidden: false,
      querySelector(selector) {
        return selector === "[data-governance-group-count]" ? libraryCount : null;
      }
    }
  ];
  const form = {
    elements: {
      severity: { value: "all" },
      module: {
        value: "all",
        selectedOptions: [{ textContent: "Alle modules" }]
      }
    },
    addEventListener(name, callback) {
      this.listenerName = name;
      this.listener = callback;
    }
  };
  const page = {
    querySelector(selector) {
      const selectors = {
        "[data-governance-filters]": form,
        "[data-governance-issue-empty]": emptyState,
        "[data-governance-active-severity]": activeSeverity,
        "[data-governance-active-module]": activeModule
      };
      return selectors[selector] || null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-governance-issue]") return rows;
      if (selector === "[data-governance-issue-group]") return groups;
      return [];
    }
  };

  return {
    root: {
      querySelector(selector) {
        return selector === "[data-governance-page]" ? page : null;
      }
    },
    form,
    rows,
    groups,
    mediaCount,
    libraryCount,
    emptyState,
    activeSeverity,
    activeModule
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
    assert.equal(report.totals.issueCount, report.issues.length);
    assert.equal(report.totals.issueErrors + report.totals.issueWarnings, report.totals.issueCount);
    assert.ok(report.modules.every((module) => Array.isArray(module.issues)));
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

  await runCheck("governance issues hebben uniforme structuur", () => {
    const report = getContentGovernanceReport({ suppliers, brochures, media, articles, library });

    assert.ok(report.issues.length > 0);
    report.issues.forEach((issue) => {
      assert.ok(GOVERNANCE_MODULE_IDS.includes(issue.module), `Onbekende module: ${issue.module}`);
      assert.ok(GOVERNANCE_ISSUE_SEVERITIES.includes(issue.severity), `Onbekende ernst: ${issue.severity}`);
      assert.equal(typeof issue.type, "string");
      assert.notEqual(issue.type.trim(), "");
      assert.equal(typeof issue.message, "string");
      assert.notEqual(issue.message.trim(), "");
      assert.equal(typeof issue.targetRoute, "string");
      assert.match(issue.targetRoute, /^#\//);
    });
  });

  await runCheck("governance issue-routes gebruiken bestaande read-only Studio-routes", () => {
    const report = getContentGovernanceReport({ suppliers, brochures, media, articles, library });
    const forbiddenActionRoute = /\/(?:nieuw|import|export)$|\/bewerken$/;

    report.issues.forEach((issue) => {
      const route = routeFromHash(issue.targetRoute);
      assert.notEqual(route.id, "notFound", `Ongeldige issue-route: ${issue.targetRoute}`);
      assert.equal(route.enabled, true, `Issue-route is niet actief: ${issue.targetRoute}`);
      assert.doesNotMatch(issue.targetRoute, forbiddenActionRoute, `Issue-route mag geen actieformulier zijn: ${issue.targetRoute}`);
    });
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
    assert.match(html, /Issue-overzicht/);
    assert.match(html, /Modules met aandacht/);
    assert.match(html, /data-governance-filters/);
    assert.match(html, /value="warning"/);
    assert.match(html, /value="error"/);
    assert.match(html, /data-governance-issue-group/);
    assert.match(html, /data-governance-group-count/);
    assert.match(html, /Geen issues zichtbaar met deze filters/);
    assert.doesNotMatch(html, /is nog niet actief|Pagina niet gevonden/);
  });

  await runCheck("governancefilters werken zonder opslag en groepering blijft intact", () => {
    const dom = createGovernanceFilterDom();

    setupGovernancePage(dom.root);
    assert.equal(dom.form.listenerName, "change");
    assert.equal(dom.rows.every((row) => row.hidden === false), true);
    assert.equal(dom.groups.every((group) => group.hidden === false), true);
    assert.equal(dom.mediaCount.textContent, "2 issues");
    assert.equal(dom.libraryCount.textContent, "1 issue");
    assert.equal(dom.emptyState.hidden, true);
    assert.equal(dom.activeSeverity.textContent, "Alle issues");
    assert.equal(dom.activeModule.textContent, "Alle modules");

    dom.form.elements.severity.value = "error";
    dom.form.elements.module.value = "media";
    dom.form.elements.module.selectedOptions = [{ textContent: "Media" }];
    dom.form.listener();

    assert.equal(dom.rows[0].hidden, true);
    assert.equal(dom.rows[1].hidden, false);
    assert.equal(dom.rows[2].hidden, true);
    assert.equal(dom.groups[0].hidden, false);
    assert.equal(dom.groups[1].hidden, true);
    assert.equal(dom.mediaCount.textContent, "1 issue");
    assert.equal(dom.libraryCount.textContent, "0 issues");
    assert.equal(dom.emptyState.hidden, true);
    assert.equal(dom.activeSeverity.textContent, "Alleen fouten");
    assert.equal(dom.activeModule.textContent, "Media");

    dom.form.elements.module.value = "library";
    dom.form.elements.module.selectedOptions = [{ textContent: "Bibliotheek" }];
    dom.form.listener();

    assert.equal(dom.rows.every((row) => row.hidden === true), true);
    assert.equal(dom.groups.every((group) => group.hidden === true), true);
    assert.equal(dom.emptyState.hidden, false);
    assert.equal(dom.activeModule.textContent, "Bibliotheek");
  });

  await runCheck("governance voegt geen opslag, backend of GitHub-integratie toe", () => {
    assertNoPattern({
      roots: ["shared", "studio", "data"],
      pattern: /localStorage|sessionStorage|indexedDB|api\.github|Octokit/i,
      label: "Verboden opslag- of integratiepatroon gevonden"
    });
    assertNoPatternInFiles({
      files: ["shared/content-governance.js", "studio/js/pages/governance.js"],
      pattern: /localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|api\.github|Octokit|download|createObjectURL|writeFile|appendFile|setItem|removeItem/i,
      label: "Governance mag geen opslag-, download- of integratiegedrag bevatten"
    });
    assertNoPatternInFiles({
      files: ["shared/content-governance.js", "studio/js/pages/governance.js", "studio/js/router.js", "studio/css/studio.css"],
      pattern: /\/Users\/|file:\/\/|[A-Za-z]:\\Users\\/i,
      label: "Governance mag geen Mac-, file-url- of absolute Windows-gebruikerspaden bevatten"
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
