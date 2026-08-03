import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  isContentStatus,
  sortContentStatuses
} from "../shared/content-status.js";
import { routeFromHash } from "../shared/routes.js";
import { STUDIO_CONFIG } from "../shared/config.js";
import { createArticleSession } from "../studio/js/state/article-session.js";
import { createBrochureSession } from "../studio/js/state/brochure-session.js";
import { createLibrarySession } from "../studio/js/state/library-session.js";
import { createMediaSession } from "../studio/js/state/media-session.js";
import { createSupplierSession } from "../studio/js/state/supplier-session.js";
import { renderValidationSummary } from "../components/validation-summary.js";
import { clearFieldErrors, focusFirstInvalidField, setFieldErrors } from "../studio/js/shared/form-errors.js";
import { downloadTextFile, readJsonFile, validateFileSelection } from "../studio/js/shared/import-export-file.js";
import { renderRouteNotFound } from "../studio/js/pages/dashboard.js";
import { renderSuppliersList } from "../studio/js/pages/suppliers/list.js";
import { renderSuppliersRoute } from "../studio/js/pages/suppliers/index.js";
import { getRouteTitle, renderRoute } from "../studio/js/router.js";
import { createFormDirtyGuard } from "../studio/js/form-dirty-guard.js";
import { runArticleChecks } from "./check-articles.mjs";
import { runArticleQualityChecks } from "./check-article-quality.mjs";
import { runBrochureChecks } from "./check-brochures.mjs";
import { runContentRelationChecks } from "./check-content-relations.mjs";
import { runContentGovernanceChecks } from "./check-content-governance.mjs";
import { runContentReadinessChecks } from "./check-content-readiness.mjs";
import { runLibraryChecks } from "./check-library.mjs";
import { runLibraryQualityChecks } from "./check-library-quality.mjs";
import { runMediaChecks } from "./check-media.mjs";
import { runPublicContentChecks } from "./check-public-content.mjs";
import { runSupplierChecks } from "./check-suppliers.mjs";

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

function createFakeForm() {
  const fields = {
    name: {
      attributes: {},
      focused: false,
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      removeAttribute(name) {
        delete this.attributes[name];
      },
      focus() {
        this.focused = true;
      }
    },
    slug: {
      attributes: {},
      focused: false,
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      removeAttribute(name) {
        delete this.attributes[name];
      },
      focus() {
        this.focused = true;
      }
    }
  };
  const errors = {
    name: { textContent: "" },
    slug: { textContent: "" }
  };

  return {
    elements: fields,
    fields,
    errors,
    querySelector(selector) {
      const match = selector.match(/data-field-error="([^"]+)"/);
      return match ? errors[match[1]] || null : null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-field-error]") return Object.values(errors);
      if (selector === "[aria-invalid='true']") {
        return Object.values(fields).filter((field) => field.attributes["aria-invalid"] === "true");
      }
      return [];
    }
  };
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

async function runStudioChecks() {
  const suppliers = readJson("data/suppliers.json");
  const brochures = readJson("data/brochures.json");
  const media = readJson("data/media.json");
  const articles = readJson("data/articles.json");
  const library = readJson("data/library.json");

  await runCheck("basis JSON-bestanden zijn geldig", () => {
    readJson("data/suppliers.json");
    readJson("data/brochures.json");
    readJson("data/media.json");
    readJson("data/articles.json");
    readJson("data/library.json");
    readJson("data/studio-navigation.json");
    readJson("data/studio-dashboard.json");
  });

  await runCheck("Studio datapaden zijn expliciet geconfigureerd", () => {
    assert.deepEqual(STUDIO_CONFIG.data, {
      navigation: "../data/studio-navigation.json",
      dashboard: "../data/studio-dashboard.json",
      suppliers: "../data/suppliers.json",
      brochures: "../data/brochures.json",
      media: "../data/media.json",
      articles: "../data/articles.json",
      library: "../data/library.json"
    });

    Object.entries(STUDIO_CONFIG.data).forEach(([key, value]) => {
      assert.equal(typeof value, "string", `Datapad ${key} ontbreekt.`);
      assert.notEqual(value, "undefined", `Datapad ${key} mag niet letterlijk undefined zijn.`);
    });
  });

  await runCheck("Studio modules importeren zonder side effects", async () => {
    await import("../shared/routes.js");
    await import("../shared/article-file-validation.js");
    await import("../shared/article-import.js");
    await import("../shared/article-export.js");
    await import("../shared/article-normalizer.js");
    await import("../shared/article-quality.js");
    await import("../shared/article-validation.js");
    await import("../shared/content-governance.js");
    await import("../shared/content-readiness.js");
    await import("../shared/content-relations.js");
    await import("../shared/content-status.js");
    await import("../shared/library-file-validation.js");
    await import("../shared/library-import.js");
    await import("../shared/library-export.js");
    await import("../shared/library-model.js");
    await import("../shared/library-normalizer.js");
    await import("../shared/library-quality.js");
    await import("../shared/library-validation.js");
    await import("../shared/brochure-file-validation.js");
    await import("../shared/brochure-normalizer.js");
    await import("../shared/media-file-validation.js");
    await import("../shared/media-normalizer.js");
    await import("../shared/media-validation.js");
    await import("../shared/public-content.js");
    await import("../shared/public-articles.js");
    await import("../shared/public-brochures.js");
    await import("../shared/public-suppliers.js");
    await import("../shared/supplier-file-validation.js");
    await import("../shared/supplier-normalizer.js");
    await import("../studio/js/shared/form-errors.js");
    await import("../studio/js/shared/import-export-file.js");
    await import("../studio/js/shared/not-found.js");
    await import("../studio/js/shared/route-metadata.js");
    await import("../studio/js/router.js");
    await import("../studio/js/route-focus.js");
    await import("../studio/js/state/article-session.js");
    await import("../studio/js/state/brochure-session.js");
    await import("../studio/js/state/library-session.js");
    await import("../studio/js/state/media-session.js");
    await import("../studio/js/pages/brochures/form.js");
    await import("../studio/js/pages/brochures/import-export.js");
    await import("../studio/js/pages/brochures/index.js");
    await import("../studio/js/pages/governance.js");
    await import("../studio/js/pages/knowledge/form.js");
    await import("../studio/js/pages/knowledge/import.js");
    await import("../studio/js/pages/knowledge/export.js");
    await import("../studio/js/pages/knowledge/index.js");
    await import("../studio/js/pages/library/form.js");
    await import("../studio/js/pages/library/import.js");
    await import("../studio/js/pages/library/export.js");
    await import("../studio/js/pages/library/index.js");
    await import("../studio/js/pages/media/form.js");
    await import("../studio/js/pages/media/index.js");
    await import("../studio/js/pages/suppliers/form.js");
    await import("../studio/js/pages/suppliers/import-export.js");
    await import("../components/confirm-dialog.js");
    await import("../components/readiness-card.js");
  });

  await runCheck("contentstatussen zijn centraal, volledig en deterministisch", () => {
    assert.deepEqual(CONTENT_STATUSES, ["concept", "review", "published", "hidden", "archived"]);
    CONTENT_STATUSES.forEach((status) => {
      assert.equal(typeof CONTENT_STATUS_LABELS[status], "string");
      assert.equal(isContentStatus(status), true);
    });
    assert.equal(isContentStatus("klaar"), false);
    assert.deepEqual(sortContentStatuses(["archived", "concept", "published"]), ["concept", "published", "archived"]);
  });

  await runCheck("formulierfouthelpers beheren tekst, aria-invalid en focus", () => {
    const form = createFakeForm();
    const errors = {
      name: "Vul een naam in.",
      slug: "Vul een slug in."
    };

    setFieldErrors(form, errors);
    assert.equal(form.errors.name.textContent, errors.name);
    assert.equal(form.fields.name.attributes["aria-invalid"], "true");

    focusFirstInvalidField(form, errors);
    assert.equal(form.fields.name.focused, true);

    clearFieldErrors(form);
    assert.equal(form.errors.name.textContent, "");
    assert.equal(form.fields.name.attributes["aria-invalid"], undefined);
  });

  await runCheck("validation summary gebruikt unieke modulespecifieke ids zonder supplier-default", () => {
    const html = renderValidationSummary(
      { name: "Vul een naam in." },
      {
        headingId: "test-validation-heading",
        fieldIdForName: (fieldName) => `field-${fieldName}`,
        title: "Controleer testformulier"
      }
    );

    assert.match(html, /aria-labelledby="test-validation-heading"/);
    assert.match(html, /href="#field-name"/);
    assert.doesNotMatch(html, /supplier-validation-summary-title/);
  });

  await runCheck("route helpers geven expliciete routes terug", () => {
    assert.equal(routeFromHash("#/dashboard").id, "dashboard");
    assert.equal(routeFromHash("#/governance").id, "governance");
    assert.equal(routeFromHash("#/governance").sectionId, "governance");
    assert.equal(routeFromHash("#/leveranciers").id, "suppliers");
    assert.equal(routeFromHash("#/leveranciers/nieuw").id, "supplierNew");
    assert.equal(routeFromHash("#/leveranciers/amefa").id, "supplierDetail");
    assert.equal(routeFromHash("#/leveranciers/amefa/bewerken").id, "supplierEdit");
    assert.equal(routeFromHash("#/brochures").id, "brochures");
    assert.equal(routeFromHash("#/brochures/nieuw").id, "brochureNew");
    assert.equal(routeFromHash("#/brochures/amefa-for-professionals-2026").id, "brochureDetail");
    assert.equal(routeFromHash("#/brochures/amefa-for-professionals-2026/bewerken").id, "brochureEdit");
    assert.equal(routeFromHash("#/media").id, "media");
    assert.equal(routeFromHash("#/media/nieuw").id, "mediaNew");
    assert.equal(routeFromHash("#/media/media-brochures-overview").id, "mediaDetail");
    assert.equal(routeFromHash("#/media/media-brochures-overview/bewerken").id, "mediaEdit");
    assert.equal(routeFromHash("#/kennisbank").id, "knowledge");
    assert.equal(routeFromHash("#/kennisbank/nieuw").id, "articleNew");
    assert.equal(routeFromHash("#/kennisbank/terras-outdoor-inspiratie").id, "articleDetail");
    assert.equal(routeFromHash("#/kennisbank/terras-outdoor-inspiratie/bewerken").id, "articleEdit");
    assert.equal(routeFromHash("#/bibliotheek").id, "library");
    assert.equal(routeFromHash("#/bibliotheek/nieuw").id, "libraryNew");
    assert.equal(routeFromHash("#/bibliotheek/import").id, "libraryImport");
    assert.equal(routeFromHash("#/bibliotheek/export").id, "libraryExport");
    assert.equal(routeFromHash("#/bibliotheek/churchill-combined-brochure-2026").id, "libraryDetail");
    assert.equal(routeFromHash("#/bibliotheek/churchill-combined-brochure-2026/bewerken").id, "libraryEdit");
    assert.equal(routeFromHash("#/bestaat-niet").id, "notFound");
  });

  await runCheck("kennisbank- en bibliotheeknavigatie blijven actief", () => {
    const navigation = readJson("data/studio-navigation.json");
    const dashboard = readJson("data/studio-dashboard.json");
    const knowledgeItem = navigation.items.find((item) => item.id === "knowledge");
    const governanceItem = navigation.items.find((item) => item.id === "governance");
    const libraryItem = navigation.items.find((item) => item.id === "library");
    const governanceMetric = dashboard.metrics.find((metric) => metric.id === "governanceAttention");
    const articleMetric = dashboard.metrics.find((metric) => metric.id === "articles");
    const libraryMetric = dashboard.metrics.find((metric) => metric.id === "library");
    const articleAction = dashboard.quickActions.find((action) => action.id === "newArticle");
    const libraryAction = dashboard.quickActions.find((action) => action.id === "newLibraryItem");

    assert.equal(governanceItem?.enabled, true);
    assert.equal(governanceItem?.route, "#/governance");
    assert.equal(governanceMetric?.state, "not_connected");
    assert.match(governanceMetric?.note || "", /validatie- en quality-rapporten/);
    assert.equal(knowledgeItem?.enabled, true);
    assert.equal(knowledgeItem?.route, "#/kennisbank");
    assert.equal(libraryItem?.enabled, true);
    assert.equal(libraryItem?.route, "#/bibliotheek");
    assert.equal(articleMetric?.state, "not_connected");
    assert.match(articleMetric?.note || "", /data\/articles\.json/);
    assert.equal(libraryMetric?.state, "not_connected");
    assert.match(libraryMetric?.note || "", /data\/library\.json/);
    assert.equal(articleAction?.enabled, true);
    assert.equal(articleAction?.route, "#/kennisbank/nieuw");
    assert.equal(libraryAction?.enabled, true);
    assert.equal(libraryAction?.route, "#/bibliotheek/nieuw");
    assert.equal(dashboard.quickActions.find((action) => action.id === "openGovernance")?.enabled, true);
    assert.equal(dashboard.quickActions.find((action) => action.id === "openGovernance")?.route, "#/governance");

    assert.equal(dashboard.metrics.find((metric) => metric.id === "articlePublished")?.state, "not_connected");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "articleWarnings")?.state, "not_connected");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "articleMissingMedia")?.state, "not_connected");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "articlesWithoutSupplier")?.state, "not_connected");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "suppliersWithoutBrochures")?.state, "not_connected");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "mediaWithoutUsage")?.state, "not_connected");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "libraryPublished")?.state, "not_connected");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "libraryWarnings")?.state, "not_connected");
    assert.equal(dashboard.metrics.find((metric) => metric.id === "libraryMissingFiles")?.state, "not_connected");
  });

  await runCheck("route titles en document title helper werken", async () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const librarySession = createLibrarySession(library, { suppliers, brochures, articles, media });
    const state = { supplierSession, brochureSession, mediaSession, articleSession, librarySession };
    assert.equal(getRouteTitle(routeFromHash("#/governance"), state), "Governance");
    assert.equal(getRouteTitle(routeFromHash("#/leveranciers/amefa"), state), "Amefa");
    assert.equal(getRouteTitle(routeFromHash("#/leveranciers/onbekend"), state), "Leverancier niet gevonden");
    assert.equal(getRouteTitle(routeFromHash("#/brochures/amefa-for-professionals-2026"), state), "Amefa for Professionals 2026");
    assert.equal(getRouteTitle(routeFromHash("#/brochures/onbekend"), state), "Brochure niet gevonden");
    assert.equal(getRouteTitle(routeFromHash("#/media/media-brochures-overview"), state), "Brochures overzichtsbeeld");
    assert.equal(getRouteTitle(routeFromHash("#/media/onbekend"), state), "Media-asset niet gevonden");
    assert.equal(getRouteTitle(routeFromHash("#/kennisbank/terras-outdoor-inspiratie"), state), "Terras & Outdoor inspiratie");
    assert.equal(getRouteTitle(routeFromHash("#/kennisbank/onbekend"), state), "Kennisbankartikel niet gevonden");
    assert.equal(getRouteTitle(routeFromHash("#/bibliotheek/import"), state), "Bibliotheek importeren");
    assert.equal(getRouteTitle(routeFromHash("#/bibliotheek/export"), state), "Bibliotheek exporteren");
    assert.equal(getRouteTitle(routeFromHash("#/bibliotheek/churchill-combined-brochure-2026"), state), "Churchill Combined Brochure 2026");
    assert.equal(getRouteTitle(routeFromHash("#/bibliotheek/onbekend"), state), "Bibliotheekitem niet gevonden");

    globalThis.document = { title: "" };
    const { applyRouteTitle, focusRouteContent } = await import("../studio/js/route-focus.js");
    applyRouteTitle("Leveranciers");
    assert.equal(globalThis.document.title, `Leveranciers – ${STUDIO_CONFIG.appName}`);

    const focusTarget = {
      dataset: {},
      attributes: {},
      hasAttribute(name) {
        return Boolean(this.attributes[name]);
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      focus(options) {
        this.focused = options;
      }
    };
    focusRouteContent({
      querySelector(selector) {
        return selector === ".studio-content h1" ? focusTarget : null;
      }
    });
    assert.deepEqual(focusTarget.focused, { preventScroll: true });
    delete globalThis.document;
  });

  await runCheck("leveranciersroutes renderen lijst, detail, nieuw en bewerken", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession
    };

    assert.match(renderRoute(routeFromHash("#/leveranciers"), state), /Leveranciers/);
    const detailHtml = renderRoute(routeFromHash("#/leveranciers/amefa"), state);

    assert.match(detailHtml, /Amefa/);
    assert.match(detailHtml, /Amefa for Professionals 2026/);
    assert.match(detailHtml, /Professioneel tafelconcept voor hospitality/);
    assert.match(detailHtml, /href="#\/brochures\/amefa-for-professionals-2026"/);
    assert.match(detailHtml, /href="#\/kennisbank\/professioneel-tafelconcept-hospitality"/);
    assert.match(renderRoute(routeFromHash("#/leveranciers/amefa/bewerken"), state), /Amefa bewerken/);
    assert.match(renderRoute(routeFromHash("#/leveranciers/nieuw"), state), /Nieuwe leverancier/);
  });

  await runCheck("brochureroutes renderen lijst, detail, nieuw en bewerken", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession
    };

    const listHtml = renderRoute(routeFromHash("#/brochures"), state);
    const newHtml = renderRoute(routeFromHash("#/brochures/nieuw"), state);
    const detailHtml = renderRoute(routeFromHash("#/brochures/amefa-for-professionals-2026"), state);
    const editHtml = renderRoute(routeFromHash("#/brochures/amefa-for-professionals-2026/bewerken"), state);

    assert.match(listHtml, /Brochurebeheer/);
    assert.match(listHtml, /Amefa for Professionals 2026/);
    assert.match(listHtml, /data-brochure-import-button/);
    assert.match(listHtml, /data-brochure-export-button/);
    assert.match(listHtml, /brochures\.json importeren/);
    assert.doesNotMatch(listHtml, /is nog niet actief/);
    assert.match(newHtml, /Nieuwe brochure/);
    assert.match(newHtml, /data-brochure-form/);
    assert.doesNotMatch(newHtml, /Pagina niet gevonden|is nog niet actief/);
    assert.match(detailHtml, /Amefa for Professionals 2026/);
    assert.match(detailHtml, /Kennisbankartikelen/);
    assert.match(detailHtml, /Professioneel tafelconcept voor hospitality/);
    assert.match(detailHtml, /href="#\/leveranciers\/amefa"/);
    assert.match(detailHtml, /href="#\/kennisbank\/professioneel-tafelconcept-hospitality"/);
    assert.match(editHtml, /Amefa for Professionals 2026 bewerken/);
  });

  await runCheck("mediaroutes renderen lijst, detail, nieuw en bewerken", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession
    };

    const listHtml = renderRoute(routeFromHash("#/media"), state);
    const newHtml = renderRoute(routeFromHash("#/media/nieuw"), state);
    const detailHtml = renderRoute(routeFromHash("#/media/media-brochures-overview"), state);
    const usedDetailHtml = renderRoute(routeFromHash("#/media/media-supplier-amefa-logo"), state);
    const editHtml = renderRoute(routeFromHash("#/media/media-brochures-overview/bewerken"), state);

    assert.match(listHtml, /Mediaregister/);
    assert.match(listHtml, /Brochures overzichtsbeeld/);
    assert.doesNotMatch(listHtml, /is nog niet actief/);
    assert.match(newHtml, /Nieuw media-asset/);
    assert.match(newHtml, /data-media-form/);
    assert.doesNotMatch(newHtml, /Pagina niet gevonden|is nog niet actief/);
    assert.match(detailHtml, /Brochures overzichtsbeeld/);
    assert.match(detailHtml, /Gebruikt door/);
    assert.match(detailHtml, /Geen leveranciers gebruiken dit pad/);
    assert.match(usedDetailHtml, /Amefa/);
    assert.match(usedDetailHtml, /Amefa for Professionals 2026/);
    assert.match(usedDetailHtml, /href="#\/leveranciers\/amefa"/);
    assert.match(usedDetailHtml, /href="#\/brochures\/amefa-for-professionals-2026"/);
    assert.match(editHtml, /Brochures overzichtsbeeld bewerken/);
  });

  await runCheck("kennisbankroutes renderen lijst, detail, nieuw en bewerken", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession
    };

    const listHtml = renderRoute(routeFromHash("#/kennisbank"), state);
    const newHtml = renderRoute(routeFromHash("#/kennisbank/nieuw"), state);
    const detailHtml = renderRoute(routeFromHash("#/kennisbank/terras-outdoor-inspiratie"), state);
    const editHtml = renderRoute(routeFromHash("#/kennisbank/terras-outdoor-inspiratie/bewerken"), state);

    assert.match(listHtml, /Kennisbankbeheer/);
    assert.match(listHtml, /Terras &amp; Outdoor inspiratie/);
    assert.match(listHtml, /data-article-import-button/);
    assert.match(listHtml, /data-article-export-button/);
    assert.match(listHtml, /articles\.json importeren/);
    assert.match(listHtml, /Kwaliteitsrapport kennisbank/);
    assert.match(listHtml, /Contentkwaliteit/);
    assert.doesNotMatch(listHtml, /is nog niet actief/);
    assert.match(newHtml, /Nieuw artikel/);
    assert.match(newHtml, /data-article-form/);
    assert.match(newHtml, /Hero afbeelding \(relatief pad\)/);
    assert.match(newHtml, /Inspiratie/);
    assert.doesNotMatch(newHtml, /Hoofdafbeelding/);
    assert.doesNotMatch(newHtml, /Pagina niet gevonden|is nog niet actief/);
    assert.match(detailHtml, /Terras &amp; Outdoor inspiratie/);
    assert.match(detailHtml, /Gekoppelde leveranciers/);
    assert.match(detailHtml, /Churchill/);
    assert.match(detailHtml, /Gekoppelde brochures/);
    assert.match(detailHtml, /Churchill Combined Brochure 2026/);
    assert.match(detailHtml, /href="#\/leveranciers\/churchill"/);
    assert.match(detailHtml, /href="#\/brochures\/churchill-combined-brochure-2026"/);
    assert.match(detailHtml, /Hero afbeelding/);
    assert.match(editHtml, /Terras &amp; Outdoor inspiratie bewerken/);
  });

  await runCheck("bibliotheekroutes renderen lijst, detail, nieuw en bewerken", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const librarySession = createLibrarySession(library, { suppliers, brochures, articles, media });
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession,
      librarySession
    };

    const listHtml = renderRoute(routeFromHash("#/bibliotheek"), state);
    const newHtml = renderRoute(routeFromHash("#/bibliotheek/nieuw"), state);
    const importHtml = renderRoute(routeFromHash("#/bibliotheek/import"), state);
    const exportHtml = renderRoute(routeFromHash("#/bibliotheek/export"), state);
    const detailHtml = renderRoute(routeFromHash("#/bibliotheek/churchill-combined-brochure-2026"), state);
    const editHtml = renderRoute(routeFromHash("#/bibliotheek/churchill-combined-brochure-2026/bewerken"), state);

    assert.match(listHtml, /Bibliotheekbeheer/);
    assert.match(listHtml, /Churchill Combined Brochure 2026/);
    assert.match(listHtml, /Terras &amp; Outdoor inspiratie gids/);
    assert.match(listHtml, /href="#\/bibliotheek\/import"/);
    assert.match(listHtml, /href="#\/bibliotheek\/export"/);
    assert.match(listHtml, /Kwaliteitsrapport bibliotheek/);
    assert.match(listHtml, /Contentkwaliteit/);
    assert.doesNotMatch(listHtml, /is nog niet actief/);
    assert.match(newHtml, /Nieuw bibliotheekitem/);
    assert.match(newHtml, /data-library-form/);
    assert.doesNotMatch(newHtml, /Pagina niet gevonden|is nog niet actief/);
    assert.match(importHtml, /Bibliotheek importeren/);
    assert.match(importHtml, /data-library-import-button/);
    assert.match(importHtml, /library\.json importeren/);
    assert.doesNotMatch(importHtml, /Pagina niet gevonden|is nog niet actief/);
    assert.match(exportHtml, /Bibliotheek exporteren/);
    assert.match(exportHtml, /data-library-export-button/);
    assert.match(exportHtml, /library\.json/);
    assert.doesNotMatch(exportHtml, /Pagina niet gevonden|is nog niet actief/);
    assert.match(detailHtml, /Churchill Combined Brochure 2026/);
    assert.match(detailHtml, /Bestandspad/);
    assert.match(detailHtml, /href="#\/leveranciers\/churchill"/);
    assert.match(detailHtml, /href="#\/brochures\/churchill-combined-brochure-2026"/);
    assert.match(editHtml, /Churchill Combined Brochure 2026 bewerken/);
  });

  await runCheck("dashboardknoppen verwijzen naar actieve brochure-, media-, kennisbank- en bibliotheekmodule", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const librarySession = createLibrarySession(library, { suppliers, brochures, articles, media });
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession,
      librarySession
    };
    const dashboardHtml = renderRoute(routeFromHash("#/dashboard"), state);
    const brochureAction = dashboardHtml.match(/<article class="studio-card">[\s\S]*?<h3>Nieuwe brochure<\/h3>[\s\S]*?<\/article>/)?.[0] || "";
    const governanceAction = dashboardHtml.match(/<article class="studio-card">[\s\S]*?<h3>Governance bekijken<\/h3>[\s\S]*?<\/article>/)?.[0] || "";
    const mediaAction = dashboardHtml.match(/<article class="studio-card">[\s\S]*?<h3>Nieuw media-asset<\/h3>[\s\S]*?<\/article>/)?.[0] || "";
    const articleAction = dashboardHtml.match(/<article class="studio-card">[\s\S]*?<h3>Nieuw artikel<\/h3>[\s\S]*?<\/article>/)?.[0] || "";
    const libraryAction = dashboardHtml.match(/<article class="studio-card">[\s\S]*?<h3>Nieuw bibliotheekitem<\/h3>[\s\S]*?<\/article>/)?.[0] || "";

    assert.match(dashboardHtml, /href="#\/governance"/);
    assert.match(dashboardHtml, /href="#\/brochures\/nieuw"/);
    assert.match(dashboardHtml, /href="#\/media\/nieuw"/);
    assert.match(dashboardHtml, /href="#\/kennisbank\/nieuw"/);
    assert.match(dashboardHtml, /href="#\/bibliotheek\/nieuw"/);
    assert.match(governanceAction, /href="#\/governance"/);
    assert.doesNotMatch(governanceAction, /Niet actief|is-disabled/);
    assert.match(brochureAction, /href="#\/brochures\/nieuw"/);
    assert.doesNotMatch(brochureAction, /Niet actief|is-disabled/);
    assert.match(mediaAction, /href="#\/media\/nieuw"/);
    assert.doesNotMatch(mediaAction, /Niet actief|is-disabled/);
    assert.match(articleAction, /href="#\/kennisbank\/nieuw"/);
    assert.doesNotMatch(articleAction, /Niet actief|is-disabled/);
    assert.match(libraryAction, /href="#\/bibliotheek\/nieuw"/);
    assert.doesNotMatch(libraryAction, /Niet actief|is-disabled/);
  });

  await runCheck("dashboard toont kennisbank- en bibliotheekmetrics uit actieve data", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const librarySession = createLibrarySession(library, { suppliers, brochures, articles, media });
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession,
      librarySession
    };
    const dashboardHtml = renderRoute(routeFromHash("#/dashboard"), state);

    assert.match(dashboardHtml, /Artikelen gepubliceerd/);
    assert.match(dashboardHtml, /Artikelwaarschuwingen/);
    assert.match(dashboardHtml, /Ontbrekende artikelmedia/);
    assert.match(dashboardHtml, /Artikelen zonder leverancier/);
    assert.match(dashboardHtml, /Leveranciers zonder brochures/);
    assert.match(dashboardHtml, /Media zonder gebruik/);
    assert.match(dashboardHtml, /Bibliotheekitems/);
    assert.match(dashboardHtml, /Governance signalen/);
    assert.match(dashboardHtml, /Bibliotheek gepubliceerd/);
    assert.match(dashboardHtml, /Bibliotheekwaarschuwingen/);
    assert.match(dashboardHtml, /Bibliotheek zonder bestand/);
  });

  await runCheck("dirty guard bewaakt formuliermutaties zonder browseropslag", async () => {
    const OriginalWindow = globalThis.window;
    const OriginalFormData = globalThis.FormData;
    globalThis.window = { location: { hash: "#/dashboard" } };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }
      entries() {
        return this.form.entries;
      }
    };

    const listeners = {};
    const form = {
      dataset: {},
      entries: [["name", "Amefa"]],
      addEventListener(name, callback) {
        listeners[name] = callback;
      },
      removeEventListener(name) {
        delete listeners[name];
      }
    };
    const dirtyNotice = { hidden: true };
    const guard = createFormDirtyGuard();
    const registration = guard.registerForm(form, { dirtyNotice });

    assert.equal(guard.isDirty(), false);
    form.entries = [["name", "Amefa gewijzigd"]];
    assert.equal(guard.isDirty(), true);
    assert.equal(dirtyNotice.hidden, false);
    registration.markClean();
    assert.equal(guard.isDirty(), false);
    registration.unregister();

    globalThis.window = OriginalWindow;
    globalThis.FormData = OriginalFormData;
  });

  await runCheck("not-foundweergaven blijven contextspecifiek", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const librarySession = createLibrarySession(library, { suppliers, brochures, articles, media });
    const genericHtml = renderRouteNotFound(routeFromHash("#/bestaat-niet"));
    const supplierHtml = renderSuppliersRoute(routeFromHash("#/leveranciers/bestaat-niet"), supplierSession);
    const state = { supplierSession, brochureSession, mediaSession, articleSession, librarySession };
    const brochureHtml = renderRoute(routeFromHash("#/brochures/bestaat-niet"), state);
    const mediaHtml = renderRoute(routeFromHash("#/media/bestaat-niet"), state);
    const articleHtml = renderRoute(routeFromHash("#/kennisbank/bestaat-niet"), state);
    const libraryHtml = renderRoute(routeFromHash("#/bibliotheek/bestaat-niet"), state);

    assert.match(genericHtml, /Pagina niet gevonden/);
    assert.match(genericHtml, /Terug naar dashboard/);
    assert.match(supplierHtml, /Leverancier niet gevonden/);
    assert.match(supplierHtml, /Terug naar leveranciers/);
    assert.match(brochureHtml, /Brochure niet gevonden/);
    assert.match(brochureHtml, /Terug naar brochures/);
    assert.match(mediaHtml, /Media-asset niet gevonden/);
    assert.match(mediaHtml, /Terug naar media/);
    assert.match(articleHtml, /Kennisbankartikel niet gevonden/);
    assert.match(articleHtml, /Terug naar kennisbank/);
    assert.match(libraryHtml, /Bibliotheekitem niet gevonden/);
    assert.match(libraryHtml, /Terug naar bibliotheek/);
  });

  await runCheck("governanceroute rendert read-only overzicht", () => {
    const supplierSession = createSupplierSession(suppliers);
    const brochureSession = createBrochureSession(brochures, suppliers);
    const mediaSession = createMediaSession(media);
    const articleSession = createArticleSession(articles, suppliers, brochures, media);
    const librarySession = createLibrarySession(library, { suppliers, brochures, articles, media });
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession,
      librarySession
    };
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

  await runCheck("import- en exportstatussen renderen begrijpelijk", () => {
    const supplierSession = createSupplierSession(suppliers);
    supplierSession.importSource(suppliers, "suppliers.json");
    let html = renderSuppliersList({
      supplierData: supplierSession.getWorkingData(),
      sessionSnapshot: supplierSession.snapshot()
    });
    assert.match(html, /Geïmporteerde sessiebron actief/);
    assert.match(html, /Importeren publiceert niets/);

    const exportResult = supplierSession.prepareExport();
    supplierSession.markExported(exportResult.report);
    html = renderSuppliersList({
      supplierData: supplierSession.getWorkingData(),
      sessionSnapshot: supplierSession.snapshot()
    });
    assert.match(html, /Dit bestand is alleen gedownload/);
    assert.match(html, /GitHub Desktop/);
  });

  await runCheck("geen window.confirm, localStorage of sessionStorage in implementatie", () => {
    const roots = ["components", "shared", "studio", "data"];
    assertNoPattern({ roots, pattern: /window\.confirm/, label: "window.confirm gevonden" });
    assertNoPattern({ roots, pattern: /localStorage/, label: "localStorage gevonden" });
    assertNoPattern({ roots, pattern: /sessionStorage/, label: "sessionStorage gevonden" });
  });

  await runCheck("geen generieke content-session toegevoegd", () => {
    assert.equal(existsSync(resolve(rootDir, "studio/js/session/content-session.js")), false);
  });

  await runCheck("technische import/exporthelpers blijven browsergedrag zonder modulekennis", async () => {
    assert.equal(validateFileSelection(null, { maxBytes: 1, extension: ".json" }).code, "missing_file");
    assert.equal(validateFileSelection({ name: "data.txt", size: 1 }, { maxBytes: 1, extension: ".json" }).code, "invalid_extension");
    assert.equal(validateFileSelection({ name: "data.json", size: 2 }, { maxBytes: 1, extension: ".json" }).code, "file_too_large");

    const OriginalFileReader = globalThis.FileReader;
    class FakeFileReader {
      listeners = {};
      result = "";
      addEventListener(name, callback) {
        this.listeners[name] = callback;
      }
      readAsText(file) {
        if (file.mode === "error") {
          this.listeners.error();
          return;
        }
        this.result = file.text;
        this.listeners.load();
      }
    }
    globalThis.FileReader = FakeFileReader;
    assert.deepEqual(await readJsonFile({ text: "{\"ok\":true}" }), { ok: true });
    await assert.rejects(() => readJsonFile({ text: "{", mode: "load" }), { code: "invalid_json" });
    await assert.rejects(() => readJsonFile({ mode: "error" }), { code: "read_failed" });
    globalThis.FileReader = OriginalFileReader;

    const OriginalDocument = globalThis.document;
    const OriginalUrl = globalThis.URL;
    const OriginalWindow = globalThis.window;
    let revokedUrl = "";
    globalThis.document = {
      body: { append() {} },
      createElement() {
        return {
          click() {},
          remove() {}
        };
      }
    };
    globalThis.URL = {
      createObjectURL() {
        return "blob:test";
      },
      revokeObjectURL(url) {
        revokedUrl = url;
      }
    };
    globalThis.window = { setTimeout: (callback) => callback() };
    downloadTextFile({ fileName: "test.json", content: "{}", type: "application/json" });
    assert.equal(revokedUrl, "blob:test");
    globalThis.document = OriginalDocument;
    globalThis.URL = OriginalUrl;
    globalThis.window = OriginalWindow;
  });

  await runSupplierChecks();
  await runBrochureChecks();
  await runMediaChecks();
  await runArticleChecks();
  await runArticleQualityChecks();
  await runLibraryChecks();
  await runLibraryQualityChecks();
  await runContentRelationChecks();
  await runContentGovernanceChecks();
  await runContentReadinessChecks();
  await runPublicContentChecks();
}

runStudioChecks()
  .then(() => {
    console.log("Studio checks voltooid.");
  })
  .catch((error) => {
    console.error(`Studio checks mislukt: ${error.message}`);
    process.exitCode = 1;
  });
