import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createArticleExport } from "../shared/article-export.js";
import { validateArticleImportData } from "../shared/article-import.js";
import { getArticleQualityReport } from "../shared/article-quality.js";
import { ARTICLES_EXPORT_FILENAME } from "../shared/article-normalizer.js";
import { createArticleSession } from "../studio/js/state/article-session.js";
import { validateArticleImportFile } from "../studio/js/pages/knowledge/import.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function firstArticle(data) {
  return data.items[0];
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runArticleQualityChecks() {
  const articles = readJson("data/articles.json");
  const suppliers = readJson("data/suppliers.json");
  const brochures = readJson("data/brochures.json");
  const media = readJson("data/media.json");

  await runCheck("kwaliteitsrapport berekent artikelstatistieken en waarschuwingen", () => {
    const report = getArticleQualityReport(articles, suppliers, brochures, media);
    assert.equal(report.valid, true);
    assert.equal(report.stats.total, articles.items.length);
    assert.equal(report.stats.published, 1);
    assert.equal(report.stats.review, 1);
    assert.ok(report.stats.warnings >= 1);
    assert.ok(report.stats.missingMediaRegistrations >= 1);
  });

  await runCheck("published artikel zonder heroImage levert kwaliteitsfout op", () => {
    const data = clone(articles);
    firstArticle(data).heroImage = "";
    const report = getArticleQualityReport(data, suppliers, brochures, media);
    assert.equal(report.valid, false);
    assert.ok(report.errors.some((error) => error.path === "items[0].heroImage"));
  });

  await runCheck("onbekende artikelrelaties leveren kwaliteitswaarschuwingen op", () => {
    const data = clone(articles);
    firstArticle(data).supplierIds = ["supplier-bestaat-niet"];
    firstArticle(data).brochureIds = ["brochure-bestaat-niet"];
    const report = getArticleQualityReport(data, suppliers, brochures, media);
    assert.ok(report.warnings.some((warning) => warning.message.includes("onbekende leverancier")));
    assert.ok(report.warnings.some((warning) => warning.message.includes("onbekende brochure")));
  });

  await runCheck("leverancier relatedArticleIds worden tegen artikelen gecontroleerd", () => {
    const supplierData = clone(suppliers);
    supplierData.items[0].relatedArticleIds = ["article-bestaat-niet"];
    const report = getArticleQualityReport(articles, supplierData, brochures, media);
    assert.ok(report.warnings.some((warning) => warning.path.includes("relatedArticleIds")));
  });

  await runCheck("artikelimport valideert schema, unieke slugs en relaties voor toepassing", () => {
    let data = clone(articles);
    let report = validateArticleImportData(data, suppliers, brochures, media, ARTICLES_EXPORT_FILENAME);
    assert.equal(report.valid, true);
    assert.equal(report.itemCount, data.items.length);

    data = clone(articles);
    data.schemaVersion = "9.9.9";
    report = validateArticleImportData(data, suppliers, brochures, media, "articles.json");
    assert.equal(report.valid, false);
    assert.ok(report.errors.some((error) => error.path === "schemaVersion"));

    data = clone(articles);
    data.items[1].slug = data.items[0].slug;
    report = validateArticleImportData(data, suppliers, brochures, media, "articles.json");
    assert.equal(report.valid, false);
    assert.ok(report.errors.some((error) => error.path === "items[1].slug"));
  });

  await runCheck("artikelimportbestandcontrole gebruikt 1 MB limiet en .json extensie", () => {
    assert.equal(validateArticleImportFile(null).report.errors[0].path, "import.file");
    assert.equal(validateArticleImportFile({ name: "articles.txt", size: 10 }).report.errors[0].path, "import.file");
    assert.equal(validateArticleImportFile({ name: "articles.json", size: 1024 * 1024 + 1 }).report.errors[0].path, "import.file");
    assert.equal(validateArticleImportFile({ name: "articles.json", size: 1024 }).ok, true);
  });

  await runCheck("artikelexport gebruikt exact articles.json en normaliseert deterministisch", () => {
    const data = clone(articles);
    data.extraRoot = "tijdelijk";
    data.items[0].extraArticle = "tijdelijk";
    const result = createArticleExport(data, suppliers, brochures, media);
    assert.equal(result.ok, true);
    assert.equal(result.fileName, ARTICLES_EXPORT_FILENAME);

    const exported = JSON.parse(result.json);
    assert.equal(exported.metadata.module, "knowledge");
    assert.equal(exported.metadata.itemCount, exported.items.length);
    assert.equal("extraRoot" in exported, false);
    assert.equal("extraArticle" in exported.items[0], false);
  });

  await runCheck("artikelsessie importeert, exporteert en beschermt dirty-state", () => {
    const session = createArticleSession(articles, suppliers, brochures, media);
    const data = clone(articles);
    data.items[0].title = "Geimporteerde titel";
    const report = validateArticleImportData(data, suppliers, brochures, media, "articles.json");

    session.importSource(data, "articles.json", report);
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.findBySlug(data.items[0].slug).title, "Geimporteerde titel");

    session.applyArticle({ ...data.items[0], title: "Werksessie titel" }, data.items[0].slug);
    assert.equal(session.snapshot().hasUnexportedChanges, true);

    const exportResult = session.prepareExport();
    assert.equal(exportResult.ok, true);
    session.markExported(exportResult.report);
    assert.equal(session.snapshot().exportedCurrent, true);
    assert.equal(session.snapshot().exportStatus, "exported_unconfirmed");
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runArticleQualityChecks()
    .then(() => {
      console.log("Article quality checks voltooid.");
    })
    .catch((error) => {
      console.error(`Article quality checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
