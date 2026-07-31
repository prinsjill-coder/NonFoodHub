import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createLibraryExport } from "../shared/library-export.js";
import { validateLibraryImportData } from "../shared/library-import.js";
import { getLibraryQualityReport } from "../shared/library-quality.js";
import { createLibrarySession } from "../studio/js/state/library-session.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function firstItem(data) {
  return data.items[0];
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runLibraryQualityChecks() {
  const library = readJson("data/library.json");
  const suppliers = readJson("data/suppliers.json");
  const brochures = readJson("data/brochures.json");
  const articles = readJson("data/articles.json");
  const media = readJson("data/media.json");

  await runCheck("bibliotheekkwaliteitsrapport heeft vaste outputstructuur", () => {
    const report = getLibraryQualityReport(library, suppliers, brochures, articles, media);

    assert.equal(typeof report.valid, "boolean");
    assert.ok(Array.isArray(report.errors));
    assert.ok(Array.isArray(report.warnings));
    assert.ok(Array.isArray(report.missingFiles));
    assert.ok(Array.isArray(report.brokenRelations));
    assert.equal(report.stats.total, library.items.length);
    assert.equal(typeof report.stats.published, "number");
    assert.equal(typeof report.stats.warnings, "number");
    assert.equal(typeof report.stats.missingFiles, "number");
  });

  await runCheck("demo-bibliotheekdata valideert met kwaliteitswaarschuwingen", () => {
    const report = getLibraryQualityReport(library, suppliers, brochures, articles, media);

    assert.equal(report.valid, true);
    assert.deepEqual(report.errors, []);
    assert.ok(report.warnings.length > 0);
    assert.ok(report.missingFiles.length > 0);
    assert.equal(report.brokenRelations.length, 0);
  });

  await runCheck("kwaliteitscontrole vindt ontbrekende bestanden en verbroken relaties", () => {
    const data = clone(library);
    firstItem(data).filePath = "";
    firstItem(data).thumbnailPath = "";
    firstItem(data).supplierIds = ["supplier-onbekend"];
    firstItem(data).brochureIds = ["brochure-onbekend"];
    firstItem(data).articleIds = ["article-onbekend"];

    const report = getLibraryQualityReport(data, suppliers, brochures, articles, media);

    assert.equal(report.valid, false);
    assert.ok(report.missingFiles.some((issue) => issue.path === "items[0].filePath"));
    assert.ok(report.missingFiles.some((issue) => issue.path === "items[0].thumbnailPath"));
    assert.ok(report.brokenRelations.some((issue) => issue.path === "items[0].supplierIds[0]"));
    assert.ok(report.brokenRelations.some((issue) => issue.path === "items[0].brochureIds[0]"));
    assert.ok(report.brokenRelations.some((issue) => issue.path === "items[0].articleIds[0]"));
  });

  await runCheck("bibliotheekimport valideert voor toepassing en rapporteert vergelijking", () => {
    const importData = clone(library);
    importData.items.push({
      ...firstItem(library),
      id: "library-nieuw-testdocument",
      title: "Nieuw testdocument",
      slug: "nieuw-testdocument",
      sortOrder: 999
    });

    const report = validateLibraryImportData(
      importData,
      suppliers,
      brochures,
      articles,
      media,
      "library.json",
      library
    );

    assert.equal(report.valid, true);
    assert.equal(report.itemCount, library.items.length + 1);
    assert.equal(report.newItems, 1);
    assert.equal(report.changedItems, 0);
  });

  await runCheck("bibliotheekexport gebruikt exact library.json en genormaliseerde data", () => {
    const data = clone(library);
    data.extraRoot = "tijdelijk";
    firstItem(data).extraItem = "tijdelijk";

    const result = createLibraryExport(data, suppliers, brochures, articles, media);

    assert.equal(result.ok, true);
    assert.equal(result.fileName, "library.json");
    assert.equal(result.data.metadata.module, "library");
    assert.equal("extraRoot" in result.data, false);
    assert.equal("extraItem" in result.data.items[0], false);
    assert.match(result.json, /"schemaVersion": "0\.1\.0"/);
    assert.match(result.json, /"metadata":/);
  });

  await runCheck("bibliotheeksessie importeert, exporteert en beschermt dirty-state", () => {
    const session = createLibrarySession(library, { suppliers, brochures, articles, media });
    const importData = clone(library);
    firstItem(importData).title = "Gewijzigd via import";
    const importReport = validateLibraryImportData(importData, suppliers, brochures, articles, media, "library.json", library);

    session.importSource(importData, "library.json", importReport);
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.findBySlug(firstItem(importData).slug).title, "Gewijzigd via import");

    session.applyLibraryItem({ ...firstItem(importData), title: "Werksessie wijziging" }, firstItem(importData).slug);
    assert.equal(session.snapshot().dirty, true);
    assert.equal(session.snapshot().hasUnexportedChanges, true);

    const exportResult = session.prepareExport();
    assert.equal(exportResult.ok, true);
    session.markExported(exportResult.report);
    assert.equal(session.snapshot().exportedCurrent, true);
    assert.equal(session.snapshot().lastExport.fileName, "library.json");
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLibraryQualityChecks()
    .then(() => {
      console.log("Library quality checks voltooid.");
    })
    .catch((error) => {
      console.error(`Library quality checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
