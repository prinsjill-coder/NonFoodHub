import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { CONTENT_STATUSES } from "../shared/content-status.js";
import { routeFromHash } from "../shared/routes.js";
import { createLibraryExport } from "../shared/library-export.js";
import { validateLibraryFile } from "../shared/library-file-validation.js";
import { validateLibraryImportData } from "../shared/library-import.js";
import {
  getLibraryCounts,
  getLibraryItems,
  LIBRARY_CATEGORIES,
  LIBRARY_TYPES
} from "../shared/library-model.js";
import {
  LIBRARY_EXPORT_FILENAME,
  normalizeLibraryFileForExport,
  normalizeLibraryFileForSession,
  stableStringify,
  stringifyLibraryExport
} from "../shared/library-normalizer.js";
import { validateLibraryItem } from "../shared/library-validation.js";
import { validateLibraryImportFile } from "../studio/js/pages/library/import.js";
import { createLibrarySession } from "../studio/js/state/library-session.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fileExists(relativePath) {
  return existsSync(resolve(rootDir, relativePath));
}

function firstItem(data) {
  return data.items[0];
}

function secondItem(data) {
  return data.items[1];
}

function validate(data, suppliers, brochures, articles, media) {
  return validateLibraryFile(data, suppliers, brochures, articles, media, { fileExists });
}

function expectInvalid(data, suppliers, brochures, articles, media, expectedPath) {
  const report = validate(data, suppliers, brochures, articles, media);
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

export async function runLibraryChecks() {
  const library = readJson("data/library.json");
  const suppliers = readJson("data/suppliers.json");
  const brochures = readJson("data/brochures.json");
  const articles = readJson("data/articles.json");
  const media = readJson("data/media.json");

  await runCheck("library.json is geldige JSON en valideert met waarschuwingen", () => {
    const report = validate(library, suppliers, brochures, articles, media);
    assert.equal(report.valid, true);
    assert.deepEqual(report.errors, []);
    assert.ok(report.warnings.some((warning) => warning.path === "items[0].filePath"));
    assert.ok(report.warnings.some((warning) => warning.message.includes("Media")));
  });

  await runCheck("bibliotheek gebruikt centrale statussen, types en categorieen", () => {
    assert.deepEqual(library.statuses, CONTENT_STATUSES);
    LIBRARY_TYPES.forEach((type) => {
      assert.ok(library.types.includes(type), `Bibliotheektype ${type} ontbreekt.`);
    });
    LIBRARY_CATEGORIES.forEach((category) => {
      assert.ok(library.categories.includes(category), `Bibliotheekcategorie ${category} ontbreekt.`);
    });
  });

  await runCheck("demo-items zijn aanwezig en gekoppeld aan bestaande modules", () => {
    const items = getLibraryItems(library);
    assert.ok(items.length >= 2);
    assert.ok(items.some((item) => item.brochureIds.includes("brochure-churchill-2026")));
    assert.ok(items.some((item) => item.supplierIds.includes("supplier-churchill")));
    assert.ok(items.some((item) => item.articleIds.includes("article-terras-outdoor-inspiratie")));
  });

  await runCheck("routes voor bibliotheek bestaan", () => {
    assert.equal(routeFromHash("#/bibliotheek").id, "library");
    assert.equal(routeFromHash("#/bibliotheek/nieuw").id, "libraryNew");
    assert.equal(routeFromHash("#/bibliotheek/import").id, "libraryImport");
    assert.equal(routeFromHash("#/bibliotheek/export").id, "libraryExport");
    assert.equal(routeFromHash("#/bibliotheek/churchill-combined-brochure-2026").id, "libraryDetail");
    assert.equal(routeFromHash("#/bibliotheek/churchill-combined-brochure-2026/bewerken").id, "libraryEdit");
  });

  await runCheck("schemaVersion en rootstructuur zijn verplicht", () => {
    let data = clone(library);
    data.schemaVersion = "";
    expectInvalid(data, suppliers, brochures, articles, media, "schemaVersion");

    const report = validate([], suppliers, brochures, articles, media);
    assert.equal(report.valid, false);
    assert.equal(report.errors[0].path, "root");
  });

  await runCheck("dubbele id en genormaliseerde slug worden geblokkeerd", () => {
    let data = clone(library);
    secondItem(data).id = firstItem(data).id;
    expectInvalid(data, suppliers, brochures, articles, media, "items[1].id");

    data = clone(library);
    secondItem(data).slug = firstItem(data).slug.toUpperCase();
    expectInvalid(data, suppliers, brochures, articles, media, "items[1].slug");
  });

  await runCheck("verplichte velden en datumformaat worden gevalideerd", () => {
    let data = clone(library);
    firstItem(data).title = "";
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].title");

    data = clone(library);
    firstItem(data).summary = "";
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].summary");

    data = clone(library);
    firstItem(data).updatedAt = "31-07-2026";
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].updatedAt");
  });

  await runCheck("ongeldige status, type, categorie en paden worden geblokkeerd", () => {
    let data = clone(library);
    firstItem(data).status = "online";
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].status");

    data = clone(library);
    firstItem(data).type = "video";
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].type");

    data = clone(library);
    firstItem(data).category = "Onbekend";
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].category");

    data = clone(library);
    firstItem(data).filePath = "/absolute/voorbeeld.pdf";
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].filePath");

    data = clone(library);
    firstItem(data).thumbnailPath = "file:///voorbeeld.png";
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].thumbnailPath");
  });

  await runCheck("onbekende relaties worden geblokkeerd", () => {
    let data = clone(library);
    firstItem(data).supplierIds = ["supplier-bestaat-niet"];
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].supplierIds");

    data = clone(library);
    firstItem(data).brochureIds = ["brochure-bestaat-niet"];
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].brochureIds");

    data = clone(library);
    firstItem(data).articleIds = ["article-bestaat-niet"];
    expectInvalid(data, suppliers, brochures, articles, media, "items[0].articleIds");
  });

  await runCheck("formuliervalidatie blokkeert dubbele slug en onbekende relatie", () => {
    let result = validateLibraryItem(
      {
        ...firstItem(library),
        slug: secondItem(library).slug
      },
      library.items,
      suppliers,
      brochures,
      articles,
      library,
      media,
      { originalSlug: firstItem(library).slug, originalId: firstItem(library).id }
    );
    assert.equal(result.errors.slug, "Deze URL-naam is al in gebruik.");

    result = validateLibraryItem(
      {
        ...firstItem(library),
        supplierIds: ["supplier-bestaat-niet"]
      },
      library.items,
      suppliers,
      brochures,
      articles,
      library,
      media,
      { originalSlug: firstItem(library).slug, originalId: firstItem(library).id }
    );
    assert.match(result.errors.supplierIds, /Onbekende leverancier/);
  });

  await runCheck("onbekende velden waarschuwen maar blokkeren laden niet", () => {
    const data = clone(library);
    data.extraRoot = "tijdelijk";
    firstItem(data).extraItem = "tijdelijk";

    const report = validate(data, suppliers, brochures, articles, media);
    assert.equal(report.valid, true);
    assert.ok(report.warnings.some((warning) => warning.path === "root.extraRoot"));
    assert.ok(report.warnings.some((warning) => warning.path === "items[0].extraItem"));
  });

  await runCheck("normalisatie is deterministisch en stript onbekende velden", () => {
    const data = clone(library);
    data.extraRoot = "tijdelijk";
    firstItem(data).extraItem = "tijdelijk";
    const first = normalizeLibraryFileForSession(data);
    const second = normalizeLibraryFileForSession(data);

    assert.equal(stableStringify(first), stableStringify(second));
    assert.equal("extraRoot" in first, false);
    assert.equal("extraItem" in first.items[0], false);
    assert.equal(stableStringify(normalizeLibraryFileForExport(data)), stableStringify(first));
    assert.match(stringifyLibraryExport(data), /"metadata":/);
  });

  await runCheck("import en export valideren modulespecifiek en gebruiken library.json", () => {
    let data = clone(library);
    firstItem(data).title = "Gewijzigde titel";
    const importReport = validateLibraryImportData(data, suppliers, brochures, articles, media, "library.json", library);

    assert.equal(importReport.valid, true);
    assert.equal(importReport.sourceFileName, "library.json");
    assert.equal(importReport.itemCount, library.items.length);
    assert.equal(importReport.changedItems, 1);

    data = clone(library);
    secondItem(data).id = firstItem(data).id;
    const invalidImport = validateLibraryImportData(data, suppliers, brochures, articles, media, "library.json", library);
    assert.equal(invalidImport.valid, false);
    assert.ok(invalidImport.errors.some((error) => error.path === "items[1].id"));

    data = clone(library);
    data.extraRoot = "tijdelijk";
    firstItem(data).extraItem = "tijdelijk";
    const exportResult = createLibraryExport(data, suppliers, brochures, articles, media);
    assert.equal(exportResult.ok, true);
    assert.equal(exportResult.fileName, LIBRARY_EXPORT_FILENAME);
    assert.equal(exportResult.fileName, "library.json");
    assert.equal("extraRoot" in exportResult.data, false);
    assert.equal("extraItem" in exportResult.data.items[0], false);
    assert.match(exportResult.json, /"items": \[/);
  });

  await runCheck("importbestandcontrole gebruikt 1 MB limiet en .json extensie", () => {
    assert.equal(validateLibraryImportFile(null).report.errors[0].path, "import.file");
    assert.equal(validateLibraryImportFile({ name: "library.txt", size: 1 }).report.errors[0].path, "import.file");
    assert.equal(validateLibraryImportFile({ name: "library.json", size: 1024 * 1024 + 1 }).report.errors[0].path, "import.file");
    assert.equal(validateLibraryImportFile({ name: "library.json", size: 1024 * 1024 }).ok, true);
  });

  await runCheck("sessie start schoon, wordt dirty en kan herstellen", () => {
    const session = createLibrarySession(library, {
      suppliers,
      brochures,
      articles,
      media
    });
    assert.equal(session.snapshot().dirty, false);

    const item = firstItem(library);
    session.applyLibraryItem({ ...item, title: `${item.title} Test` }, item.slug);
    assert.equal(session.snapshot().dirty, true);
    assert.equal(session.snapshot().hasUnexportedChanges, true);

    session.restoreSource();
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.findBySlug(item.slug).title, item.title);
  });

  await runCheck("sessie kan importeren, exporteren en exportstatus registreren", () => {
    const session = createLibrarySession(library, {
      suppliers,
      brochures,
      articles,
      media
    });
    const data = clone(library);
    firstItem(data).title = "Geimporteerd bibliotheekitem";
    const report = validateLibraryImportData(data, suppliers, brochures, articles, media, "library.json", library);

    session.importSource(data, "library.json", report);
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.snapshot().sourceType, "imported");
    assert.equal(session.findById(firstItem(data).id).title, "Geimporteerd bibliotheekitem");

    session.applyLibraryItem({ ...firstItem(data), title: "Nieuwe werksessietitel" }, firstItem(data).slug);
    assert.equal(session.snapshot().hasUnexportedChanges, true);

    const exportResult = session.prepareExport();
    assert.equal(exportResult.ok, true);
    assert.equal(exportResult.fileName, "library.json");
    session.markExported(exportResult.report);
    assert.equal(session.snapshot().exportedCurrent, true);
    assert.equal(session.snapshot().lastExport.fileName, "library.json");
  });

  await runCheck("sessie beschermt snapshots en gevonden items tegen externe mutatie", () => {
    const session = createLibrarySession(library, {
      suppliers,
      brochures,
      articles,
      media
    });
    const snapshot = session.snapshot();
    snapshot.lastValidationReport.errors.push({ path: "test", message: "mutatie" });
    assert.equal(session.snapshot().lastValidationReport.errors.length, 0);

    const found = session.findBySlug(firstItem(library).slug);
    found.title = "Mutatie buiten sessie";
    assert.notEqual(session.findBySlug(firstItem(library).slug).title, "Mutatie buiten sessie");
  });

  await runCheck("bibliotheektellingen rapporteren registrywaarden", () => {
    const counts = getLibraryCounts(library);
    assert.equal(counts.total, library.items.length);
    assert.equal(counts.missingFilePath, 0);
    assert.equal(counts.statuses.ready || 0, library.items.filter((item) => item.status === "ready").length);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLibraryChecks()
    .then(() => {
      console.log("Library checks voltooid.");
    })
    .catch((error) => {
      console.error(`Library checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
