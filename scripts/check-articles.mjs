import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { CONTENT_STATUSES } from "../shared/content-status.js";
import { createArticleExport } from "../shared/article-export.js";
import { validateArticleFile } from "../shared/article-file-validation.js";
import { validateArticleImportData } from "../shared/article-import.js";
import { ARTICLE_CATEGORIES, getArticleCounts } from "../shared/article-model.js";
import {
  ARTICLES_EXPORT_FILENAME,
  normalizeArticleFileForExport,
  normalizeArticleFileForSession,
  stableStringify
} from "../shared/article-normalizer.js";
import { validateArticle } from "../shared/article-validation.js";
import { createArticleSession } from "../studio/js/state/article-session.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_ARTICLE_CATEGORIES = [
  "Inspiratie",
  "Terras & Outdoor",
  "Tafelpresentatie",
  "Buffet & presentatie",
  "Gastbeleving",
  "Koffie & dranken",
  "Trends"
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function firstArticle(data) {
  return data.items[0];
}

function secondArticle(data) {
  return data.items[1];
}

function expectInvalid(data, suppliers, brochures, media, expectedPath) {
  const report = validateArticleFile(data, suppliers, brochures, media);
  assert.equal(report.valid, false);
  assert.ok(
    report.errors.some((error) => error.path === expectedPath),
    `Verwachtte fout op ${expectedPath}`
  );
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runArticleChecks() {
  const articles = readJson("data/articles.json");
  const suppliers = readJson("data/suppliers.json");
  const brochures = readJson("data/brochures.json");
  const media = readJson("data/media.json");

  await runCheck("articles.json is geldige JSON en valideert met waarschuwingen", () => {
    const report = validateArticleFile(articles, suppliers, brochures, media);
    assert.equal(report.valid, true);
    assert.deepEqual(report.errors, []);
    assert.ok(report.warnings.some((warning) => warning.path === "items[0].heroImage"));
  });

  await runCheck("artikelen gebruiken centrale contentstatussen en minimaal twee demo-items", () => {
    assert.deepEqual(articles.statuses, CONTENT_STATUSES);
    assert.ok(articles.items.length >= 2);
  });

  await runCheck("categorieconfiguratie bevat alle verplichte kennisbankcategorieen", () => {
    REQUIRED_ARTICLE_CATEGORIES.forEach((category) => {
      assert.ok(ARTICLE_CATEGORIES.includes(category), `Categorie ${category} ontbreekt in artikelconfiguratie.`);
      assert.ok(articles.categories.includes(category), `Categorie ${category} ontbreekt in articles.json.`);
    });
  });

  await runCheck("dubbele id wordt geblokkeerd", () => {
    const data = clone(articles);
    secondArticle(data).id = firstArticle(data).id;
    expectInvalid(data, suppliers, brochures, media, "items[1].id");
  });

  await runCheck("dubbele genormaliseerde slug wordt geblokkeerd", () => {
    const data = clone(articles);
    secondArticle(data).slug = firstArticle(data).slug;
    expectInvalid(data, suppliers, brochures, media, "items[1].slug");
  });

  await runCheck("ongeldige rootstructuur wordt geblokkeerd", () => {
    const report = validateArticleFile([], suppliers, brochures, media);
    assert.equal(report.valid, false);
    assert.equal(report.errors[0].path, "root");
  });

  await runCheck("verplichte velden en datumformaat worden gevalideerd", () => {
    let data = clone(articles);
    firstArticle(data).title = "";
    expectInvalid(data, suppliers, brochures, media, "items[0].title");

    data = clone(articles);
    firstArticle(data).summary = "";
    expectInvalid(data, suppliers, brochures, media, "items[0].summary");

    data = clone(articles);
    firstArticle(data).body = "";
    expectInvalid(data, suppliers, brochures, media, "items[0].body");

    data = clone(articles);
    firstArticle(data).categories = [];
    expectInvalid(data, suppliers, brochures, media, "items[0].categories");

    data = clone(articles);
    firstArticle(data).updatedAt = "31-07-2026";
    expectInvalid(data, suppliers, brochures, media, "items[0].updatedAt");
  });

  await runCheck("ongeldige categorieen en ontbrekende categorieconfiguratie blokkeren validatie", () => {
    let data = clone(articles);
    firstArticle(data).categories = ["Onbekende categorie"];
    expectInvalid(data, suppliers, brochures, media, "items[0].categories[0]");

    data = clone(articles);
    data.categories = data.categories.filter((category) => category !== "Inspiratie");
    expectInvalid(data, suppliers, brochures, media, "categories");
  });

  await runCheck("formuliervalidatie verplicht minimaal een geldige categorie", () => {
    let result = validateArticle(
      {
        ...firstArticle(articles),
        categories: []
      },
      articles.items,
      suppliers,
      brochures,
      articles,
      media,
      { originalSlug: firstArticle(articles).slug, originalId: firstArticle(articles).id }
    );

    assert.equal(result.errors.categories, "Kies minimaal een categorie voordat dit artikel gereed is voor publicatie.");

    result = validateArticle(
      {
        ...firstArticle(articles),
        categories: ["Onbekende categorie"]
      },
      articles.items,
      suppliers,
      brochures,
      articles,
      media,
      { originalSlug: firstArticle(articles).slug, originalId: firstArticle(articles).id }
    );

    assert.equal(result.errors.categories, "Onbekende categorie: Onbekende categorie.");
  });

  await runCheck("padvalidatie blokkeert lokale paden, file-url en Windows-paden", () => {
    let data = clone(articles);
    firstArticle(data).heroImage = "/absolute/voorbeeld.png";
    expectInvalid(data, suppliers, brochures, media, "items[0].heroImage");

    data = clone(articles);
    firstArticle(data).heroImage = "file:///voorbeeld.png";
    expectInvalid(data, suppliers, brochures, media, "items[0].heroImage");

    data = clone(articles);
    firstArticle(data).heroImage = "Z:\\absolute\\voorbeeld.png";
    expectInvalid(data, suppliers, brochures, media, "items[0].heroImage");
  });

  await runCheck("onbekende relaties blokkeren validatie", () => {
    let data = clone(articles);
    firstArticle(data).supplierIds = ["supplier-bestaat-niet"];
    expectInvalid(data, suppliers, brochures, media, "items[0].supplierIds[0]");

    data = clone(articles);
    firstArticle(data).brochureIds = ["brochure-bestaat-niet"];
    expectInvalid(data, suppliers, brochures, media, "items[0].brochureIds[0]");
  });

  await runCheck("heroImage blijft optioneel bij concept en ontbrekende mediaregistratie waarschuwt alleen", () => {
    let result = validateArticle(
      {
        ...firstArticle(articles),
        status: "concept",
        heroImage: ""
      },
      articles.items,
      suppliers,
      brochures,
      articles,
      media,
      { originalSlug: firstArticle(articles).slug, originalId: firstArticle(articles).id }
    );

    assert.equal(result.errors.heroImage, undefined);
    assert.equal(result.warnings.heroImage, "Er is nog geen hero afbeelding gekoppeld.");

    result = validateArticle(
      {
        ...firstArticle(articles),
        heroImage: "assets/images/blog-terras.png"
      },
      articles.items,
      suppliers,
      brochures,
      articles,
      media,
      { originalSlug: firstArticle(articles).slug, originalId: firstArticle(articles).id }
    );

    assert.equal(result.errors.heroImage, undefined);
    assert.equal(result.warnings.heroImage, "Headerafbeelding staat nog niet in Media.");
  });

  await runCheck("formuliervalidatie rapporteert fouten en waarschuwingen apart", () => {
    const result = validateArticle(
      {
        ...firstArticle(articles),
        id: secondArticle(articles).id,
        slug: secondArticle(articles).slug,
        heroImage: "assets/images/blog-terras.png"
      },
      articles.items,
      suppliers,
      brochures,
      articles,
      media,
      { originalSlug: firstArticle(articles).slug, originalId: firstArticle(articles).id }
    );

    assert.equal(result.errors.id, "Deze id is al in gebruik.");
    assert.equal(result.errors.slug, "Deze URL-naam is al in gebruik.");
    assert.equal(result.warnings.heroImage, "Headerafbeelding staat nog niet in Media.");
  });

  await runCheck("onbekende velden waarschuwen maar blokkeren laden niet", () => {
    const data = clone(articles);
    data.extraRoot = "tijdelijk";
    firstArticle(data).extraArticle = "tijdelijk";

    const report = validateArticleFile(data, suppliers, brochures, media);
    assert.equal(report.valid, true);
    assert.ok(report.warnings.some((warning) => warning.path === "root.extraRoot"));
    assert.ok(report.warnings.some((warning) => warning.path === "items[0].extraArticle"));
  });

  await runCheck("normalisatie is deterministisch en stript onbekende velden", () => {
    const data = clone(articles);
    data.extraRoot = "tijdelijk";
    firstArticle(data).extraArticle = "tijdelijk";
    const first = normalizeArticleFileForSession(data);
    const second = normalizeArticleFileForSession(data);
    const exported = normalizeArticleFileForExport(data);

    assert.equal(stableStringify(first), stableStringify(second));
    assert.equal("extraRoot" in first, false);
    assert.equal("extraArticle" in first.items[0], false);
    assert.equal("extraRoot" in exported, false);
    assert.equal(exported.metadata.module, "knowledge");
    assert.equal(exported.metadata.itemCount, exported.items.length);
  });

  await runCheck("artikelimport en artikelexport gebruiken genormaliseerde articles.json", () => {
    const importReport = validateArticleImportData(articles, suppliers, brochures, media, ARTICLES_EXPORT_FILENAME);
    const exportResult = createArticleExport(articles, suppliers, brochures, media);

    assert.equal(importReport.valid, true);
    assert.equal(importReport.itemCount, articles.items.length);
    assert.equal(exportResult.ok, true);
    assert.equal(exportResult.fileName, ARTICLES_EXPORT_FILENAME);
    assert.equal(JSON.parse(exportResult.json).metadata.module, "knowledge");
  });

  await runCheck("sessie start schoon, wordt dirty en kan herstellen", () => {
    const session = createArticleSession(articles, suppliers, brochures, media);
    assert.equal(session.snapshot().dirty, false);

    const article = firstArticle(articles);
    session.applyArticle({ ...article, title: `${article.title} Test` }, article.slug);
    assert.equal(session.snapshot().dirty, true);
    assert.equal(session.snapshot().hasUnexportedChanges, true);

    session.restoreSource();
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.findBySlug(article.slug).title, article.title);
  });

  await runCheck("sessie kan conceptartikel definitief verwijderen uit de bewerkversie", () => {
    const source = clone(articles);
    const draft = {
      ...firstArticle(source),
      id: "article-delete-check",
      title: "Delete check artikel",
      slug: "delete-check-artikel",
      status: "concept",
      supplierIds: [],
      brochureIds: [],
      sortOrder: 999
    };
    source.items.push(draft);
    const session = createArticleSession(source, suppliers, brochures, media);

    assert.equal(session.findBySlug(draft.slug).id, draft.id);
    session.deleteArticle(draft.slug);

    assert.equal(session.findBySlug(draft.slug), null);
    assert.equal(session.snapshot().dirty, true);
    assert.equal(session.snapshot().lastValidationReport.valid, true);
    assert.equal(session.getSourceData().items.some((article) => article.id === draft.id), true);
  });

  await runCheck("sessie kan importeren, exporteren en exportstatus registreren", () => {
    const session = createArticleSession(articles, suppliers, brochures, media);
    const data = clone(articles);
    firstArticle(data).title = "Geimporteerd artikel";
    const report = validateArticleImportData(data, suppliers, brochures, media, ARTICLES_EXPORT_FILENAME);

    session.importSource(data, ARTICLES_EXPORT_FILENAME, report);
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.findBySlug(firstArticle(data).slug).title, "Geimporteerd artikel");

    session.applyArticle({ ...firstArticle(data), title: "Gewijzigd artikel" }, firstArticle(data).slug);
    assert.equal(session.snapshot().hasUnexportedChanges, true);

    const exportResult = session.prepareExport();
    assert.equal(exportResult.ok, true);
    session.markExported(exportResult.report);
    assert.equal(session.snapshot().exportedCurrent, true);
    assert.equal(session.snapshot().lastExport.fileName, ARTICLES_EXPORT_FILENAME);
  });

  await runCheck("sessie vindt items op slug en id en beschermt interne state", () => {
    const session = createArticleSession(articles, suppliers, brochures, media);
    const article = firstArticle(articles);

    assert.equal(session.findBySlug(article.slug).id, article.id);
    assert.equal(session.findById(article.id).slug, article.slug);

    const snapshot = session.snapshot();
    snapshot.lastValidationReport.errors.push({ path: "test", message: "mutatie" });
    assert.equal(session.snapshot().lastValidationReport.errors.length, 0);

    const found = session.findBySlug(article.slug);
    found.title = "Mutatie buiten sessie";
    assert.notEqual(session.findBySlug(article.slug).title, "Mutatie buiten sessie");
  });

  await runCheck("artikeltellingen rapporteren registrywaarden", () => {
    const counts = getArticleCounts(articles);
    assert.equal(counts.total, articles.items.length);
    assert.equal(counts.missingHeroImage, 0);
    assert.equal(counts.statuses.published, articles.items.filter((article) => article.status === "published").length);
    assert.ok(counts.statuses.published >= 2);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runArticleChecks()
    .then(() => {
      console.log("Article checks voltooid.");
    })
    .catch((error) => {
      console.error(`Article checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
