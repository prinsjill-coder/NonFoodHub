import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { CONTENT_STATUSES, CONTENT_STATUS_LABELS } from "../shared/content-status.js";
import { validateBrochureFile } from "../shared/brochure-file-validation.js";
import { createBrochureEditionDraft } from "../shared/brochure-model.js";
import {
  BROCHURE_STORAGE_NOTICE,
  BROCHURES_EXPORT_FILENAME,
  normalizeBrochureFileForSession,
  stableStringify,
  stringifyBrochureExport
} from "../shared/brochure-normalizer.js";
import { validateBrochure } from "../shared/brochure-validation.js";
import { validateBrochureImportFile } from "../studio/js/pages/brochures/import-export.js";
import { createBrochureSession } from "../studio/js/state/brochure-session.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function firstBrochure(data) {
  return data.items[0];
}

function secondBrochure(data) {
  return data.items[1];
}

function expectInvalid(data, suppliers, expectedPath) {
  const report = validateBrochureFile(data, suppliers);
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

export async function runBrochureChecks() {
  const brochures = readJson("data/brochures.json");
  const suppliers = readJson("data/suppliers.json");

  await runCheck("brochures.json is geldige JSON en valideert volledig", () => {
    const report = validateBrochureFile(brochures, suppliers);
    assert.equal(report.valid, true);
    assert.deepEqual(report.errors, []);
  });

  await runCheck("brochurebeheer communiceert de actuele handmatige overdracht", () => {
    assert.equal(brochures.storage.mode, "static-import-export");
    assert.equal(brochures.storage.writeEnabled, false);
    assert.equal(brochures.storage.message, BROCHURE_STORAGE_NOTICE);

    const runtimeText = [
      readText("components/project-file-picker.js"),
      readText("studio/js/pages/brochures/form.js"),
      readText("studio/js/pages/brochures/list.js")
    ].join("\n");
    const docsText = readText("docs/05-studio.md");

    assert.doesNotMatch(
      runtimeText,
      /Sprint 6A|deel 2 toegevoegd|publicatie voor brochures worden later toegevoegd|Import, export, uploads en publicatie zijn nog niet beschikbaar/
    );
    assert.match(runtimeText, /Gegevens exporteren/);
    assert.match(runtimeText, /publieke website/);
    assert.match(runtimeText, /Nieuwe leverancier toevoegen/);
    assert.match(runtimeText, /PDF kiezen/);
    assert.match(runtimeText, /Afbeelding kiezen/);
    assert.match(runtimeText, /Gekozen lokaal bestand/);
    assert.match(runtimeText, /Verwachte projectbestandsnaam/);
    assert.match(runtimeText, /Studio neemt de gekozen bestandsnaam over/);
    assert.match(readText("studio/js/pages/brochures/detail.js"), /fileLabel: "PDF"/);
    assert.match(readText("studio/js/pages/brochures/detail.js"), /fileLabel: "Thumbnail"/);
    assert.match(readText("studio/js/pages/brochures/detail.js"), /Nieuwe jaargang toevoegen/);
    assert.match(readText("studio/js/pages/brochures/detail.js"), /data-brochure-archive/);
    assert.match(readText("studio/js/pages/brochures/detail.js"), /PDF openen/);
    assert.match(readText("studio/js/pages/brochures/detail.js"), /Projectbestand nog plaatsen of controleren in Media/);
    assert.match(readText("studio/js/pages/brochures/detail.js"), /Mediaregistratie ontbreekt/);
    assert.match(readText("studio/js/pages/brochures/form.js"), /basisregistratie in Media/);
    assert.doesNotMatch(readText("studio/js/pages/brochures/detail.js"), /Leverancier openen/);
    assert.match(docsText, /Brochurebeheerprocedure voor v1\.0/);
    assert.match(docsText, /data\/public\/brochures\.json/);
  });

  await runCheck("brochurevalidatie gebruikt centrale contentstatussen en bestaande leveranciers", () => {
    assert.deepEqual(brochures.statuses, CONTENT_STATUSES);
    CONTENT_STATUSES.forEach((status) => {
      assert.equal(typeof CONTENT_STATUS_LABELS[status], "string");
    });

    const brochure = {
      ...firstBrochure(brochures),
      status: "ongeldig"
    };
    const errors = validateBrochure(brochure, brochures.items, suppliers, brochures, {
      originalSlug: brochure.slug,
      originalId: brochure.id
    });
    assert.equal(errors.status, "Kies een geldige status.");

    const missingSupplier = validateBrochure(
      { ...firstBrochure(brochures), supplierId: "supplier-bestaat-niet" },
      brochures.items,
      suppliers,
      brochures,
      { originalSlug: firstBrochure(brochures).slug, originalId: firstBrochure(brochures).id }
    );
    assert.equal(missingSupplier.supplierId, "Kies een bestaande leverancier.");
  });

  await runCheck("legacy brochurestatussen migreren naar het RC2-statusmodel", () => {
    const data = clone(brochures);
    data.statuses = ["concept", "review", "published", "hidden"];
    firstBrochure(data).status = "review";
    secondBrochure(data).status = "hidden";

    const rawReport = validateBrochureFile(data, suppliers);
    assert.equal(rawReport.valid, false);
    assert.ok(rawReport.errors.some((error) => error.path === "statuses" && error.message.includes("ready")));

    const normalized = normalizeBrochureFileForSession(data);
    assert.deepEqual(normalized.statuses, CONTENT_STATUSES);
    assert.equal(firstBrochure(normalized).status, "concept");
    assert.equal(secondBrochure(normalized).status, "archived");

    const session = createBrochureSession(data, suppliers);
    assert.equal(session.snapshot().lastValidationReport.valid, true);
    assert.deepEqual(session.getWorkingData().statuses, CONTENT_STATUSES);
  });

  await runCheck("dubbele id wordt geblokkeerd", () => {
    const data = clone(brochures);
    secondBrochure(data).id = firstBrochure(data).id;
    expectInvalid(data, suppliers, "items[1].id");
  });

  await runCheck("dubbele genormaliseerde slug wordt geblokkeerd", () => {
    const data = clone(brochures);
    secondBrochure(data).slug = firstBrochure(data).slug;
    expectInvalid(data, suppliers, "items[1].slug");
  });

  await runCheck("ongeldige rootstructuur wordt geblokkeerd", () => {
    const report = validateBrochureFile([], suppliers);
    assert.equal(report.valid, false);
    assert.equal(report.errors[0].path, "root");
  });

  await runCheck("padvalidatie blokkeert lokale paden, file-url en niet-pdf bij pdfFile", () => {
    let data = clone(brochures);
    firstBrochure(data).pdfFile = "/absolute/voorbeeld.pdf";
    expectInvalid(data, suppliers, "items[0].pdfFile");

    data = clone(brochures);
    firstBrochure(data).thumbnail = "file:///voorbeeld.jpg";
    expectInvalid(data, suppliers, "items[0].thumbnail");

    data = clone(brochures);
    firstBrochure(data).pdfFile = "C:\\temp\\voorbeeld.pdf";
    expectInvalid(data, suppliers, "items[0].pdfFile");

    data = clone(brochures);
    firstBrochure(data).pdfFile = "assets/downloads/brochures/voorbeeld.docx";
    expectInvalid(data, suppliers, "items[0].pdfFile");
  });

  await runCheck("nieuwe jaargang helper maakt uniek concept zonder bestaande brochure te overschrijven", () => {
    const source = firstBrochure(brochures);
    const draft = createBrochureEditionDraft(source, brochures.items, { date: new Date("2026-08-04T00:00:00Z") });

    assert.equal(draft.status, "concept");
    assert.equal(draft.year, 2027);
    assert.equal(draft.title, source.title.replace("2026", "2027"));
    assert.equal(draft.slug, "amefa-for-professionals-2027");
    assert.equal(draft.id, "brochure-amefa-2027");
    assert.equal(draft.pdfFile, "assets/downloads/brochures/amefa-for-professionals-2027.pdf");
    assert.equal(draft.pdfSize, "");
    assert.equal(draft.thumbnail, "assets/images/supplier-amefa.jpg");
    assert.equal(source.status, "published");
    assert.equal(source.pdfFile, "assets/downloads/brochures/amefa-for-professionals-2026.pdf");

    const duplicateDraft = createBrochureEditionDraft(
      source,
      [...brochures.items, draft],
      { date: new Date("2026-08-04T00:00:00Z") }
    );
    assert.equal(duplicateDraft.slug, "amefa-for-professionals-2027-2");
    assert.equal(duplicateDraft.id, "brochure-amefa-2027-2");
  });

  await runCheck("pdfFile is optioneel bij concept en verplicht bij ready of published", () => {
    let data = clone(brochures);
    firstBrochure(data).status = "concept";
    firstBrochure(data).pdfFile = "";
    assert.equal(validateBrochureFile(data, suppliers).valid, true);

    data = clone(brochures);
    firstBrochure(data).status = "ready";
    firstBrochure(data).pdfFile = "";
    expectInvalid(data, suppliers, "items[0].pdfFile");

    data = clone(brochures);
    firstBrochure(data).status = "published";
    firstBrochure(data).pdfFile = "";
    expectInvalid(data, suppliers, "items[0].pdfFile");
  });

  await runCheck("thumbnail is verplicht bij ready en published", () => {
    let data = clone(brochures);
    firstBrochure(data).status = "concept";
    firstBrochure(data).thumbnail = "";
    assert.equal(validateBrochureFile(data, suppliers).valid, true);

    data = clone(brochures);
    firstBrochure(data).status = "ready";
    firstBrochure(data).thumbnail = "";
    expectInvalid(data, suppliers, "items[0].thumbnail");

    data = clone(brochures);
    firstBrochure(data).status = "published";
    firstBrochure(data).thumbnail = "";
    expectInvalid(data, suppliers, "items[0].thumbnail");
  });

  await runCheck("year, categories, sortOrder en updatedAt valideren", () => {
    let data = clone(brochures);
    firstBrochure(data).year = 1800;
    expectInvalid(data, suppliers, "items[0].year");

    data = clone(brochures);
    firstBrochure(data).categories = ["Bestek", ""];
    expectInvalid(data, suppliers, "items[0].categories[1]");

    data = clone(brochures);
    firstBrochure(data).sortOrder = "10";
    expectInvalid(data, suppliers, "items[0].sortOrder");

    data = clone(brochures);
    firstBrochure(data).updatedAt = "30-07-2026";
    expectInvalid(data, suppliers, "items[0].updatedAt");
  });

  await runCheck("onbekende velden waarschuwen maar blokkeren laden niet", () => {
    const data = clone(brochures);
    data.extraRoot = "tijdelijk";
    firstBrochure(data).extraBrochure = "tijdelijk";

    const report = validateBrochureFile(data, suppliers);
    assert.equal(report.valid, true);
    assert.ok(report.warnings.some((warning) => warning.path === "root.extraRoot"));
    assert.ok(report.warnings.some((warning) => warning.path === "items[0].extraBrochure"));
  });

  await runCheck("normalisatie is deterministisch en stript onbekende velden", () => {
    const data = clone(brochures);
    data.extraRoot = "tijdelijk";
    firstBrochure(data).extraBrochure = "tijdelijk";
    const first = normalizeBrochureFileForSession(data);
    const second = normalizeBrochureFileForSession(data);

    assert.equal(stableStringify(first), stableStringify(second));
    assert.equal("extraRoot" in first, false);
    assert.equal("extraBrochure" in first.items[0], false);
  });

  await runCheck("exportbestand heet exact brochures.json en bevat actieve brochuredata", () => {
    const session = createBrochureSession(brochures, suppliers);
    const brochure = firstBrochure(brochures);
    session.applyBrochure({ ...brochure, title: `${brochure.title} Exporttest` }, brochure.slug);

    const result = session.prepareExport();
    const exported = JSON.parse(result.json);

    assert.equal(BROCHURES_EXPORT_FILENAME, "brochures.json");
    assert.equal(result.ok, true);
    assert.equal(result.fileName, "brochures.json");
    assert.equal(exported.items.find((item) => item.id === brochure.id).title, `${brochure.title} Exporttest`);
    assert.equal("lastValidationReport" in exported, false);
    assert.equal("lastExport" in exported, false);
  });

  await runCheck("export neemt nieuw aangemaakte brochures mee", () => {
    const session = createBrochureSession(brochures, suppliers);
    session.applyBrochure(
      {
        ...firstBrochure(brochures),
        id: "brochure-export-nieuw",
        title: "Nieuwe exportbrochure",
        slug: "nieuwe-exportbrochure",
        status: "concept",
        pdfFile: "",
        thumbnail: "",
        sortOrder: 99
      },
      ""
    );

    const exported = JSON.parse(session.prepareExport().json);
    assert.ok(exported.items.some((item) => item.id === "brochure-export-nieuw"));
  });

  await runCheck("geldige import wordt genormaliseerde bron zonder onbekende velden", () => {
    const data = clone(brochures);
    data.extraRoot = "tijdelijk";
    firstBrochure(data).extraBrochure = "tijdelijk";
    const report = {
      ...validateBrochureFile(data, suppliers),
      action: "import",
      sourceFileName: "brochures.json",
      itemCount: data.items.length
    };
    const session = createBrochureSession(brochures, suppliers);

    assert.equal(report.valid, true);
    assert.ok(report.warnings.some((warning) => warning.path === "root.extraRoot"));
    session.importSource(data, "brochures.json", report);

    const workingData = session.getWorkingData();
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.snapshot().sourceType, "imported");
    assert.equal("extraRoot" in workingData, false);
    assert.equal("extraBrochure" in workingData.items[0], false);
  });

  await runCheck("foutieve import blokkeert en wijzigt de sessie niet", () => {
    const session = createBrochureSession(brochures, suppliers);
    const before = stableStringify(session.getWorkingData());
    const data = clone(brochures);
    secondBrochure(data).id = firstBrochure(data).id;
    const report = validateBrochureFile(data, suppliers);

    assert.equal(report.valid, false);
    if (report.valid) {
      session.importSource(data, "brochures.json", report);
    } else {
      session.setValidationReport({ ...report, action: "import", sourceFileName: "brochures.json" });
    }

    assert.equal(stableStringify(session.getWorkingData()), before);
  });

  await runCheck("supplier-validatie blijft actief bij brochure-import", () => {
    const data = clone(brochures);
    firstBrochure(data).supplierId = "supplier-bestaat-niet";
    expectInvalid(data, suppliers, "items[0].supplierId");
  });

  await runCheck("brochure importbestandcontrole gebruikt 1 MB limiet en .json extensie", () => {
    assert.equal(validateBrochureImportFile(null).report.errors[0].path, "import.file");
    assert.equal(validateBrochureImportFile({ name: "brochures.txt", size: 1 }).report.errors[0].path, "import.file");
    assert.equal(validateBrochureImportFile({ name: "brochures.json", size: 1024 * 1024 + 1 }).report.errors[0].path, "import.file");
    assert.equal(validateBrochureImportFile({ name: "brochures.json", size: 1024 }).ok, true);
  });

  await runCheck("brochure exportnormalisatie blijft deterministisch", () => {
    const first = stringifyBrochureExport(brochures);
    const second = stringifyBrochureExport(brochures);

    assert.equal(first, second);
    assert.equal(JSON.parse(first).items.length, brochures.items.length);
  });

  await runCheck("sessie start schoon, wordt dirty en kan herstellen", () => {
    const session = createBrochureSession(brochures, suppliers);
    assert.equal(session.snapshot().dirty, false);

    const brochure = firstBrochure(brochures);
    session.applyBrochure({ ...brochure, title: `${brochure.title} Test` }, brochure.slug);
    assert.equal(session.snapshot().dirty, true);
    assert.equal(session.snapshot().hasUnexportedChanges, true);

    session.restoreSource();
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.findBySlug(brochure.slug).title, brochure.title);
  });

  await runCheck("sessie kan conceptbrochure definitief verwijderen uit de bewerkversie", () => {
    const source = clone(brochures);
    const draft = {
      ...firstBrochure(source),
      id: "brochure-delete-check",
      title: "Delete check brochure",
      slug: "delete-check-brochure",
      status: "concept",
      pdfFile: "",
      thumbnail: "",
      sortOrder: 999
    };
    source.items.push(draft);
    const session = createBrochureSession(source, suppliers);

    assert.equal(session.findBySlug(draft.slug).id, draft.id);
    session.deleteBrochure(draft.slug);

    assert.equal(session.findBySlug(draft.slug), null);
    assert.equal(session.snapshot().dirty, true);
    assert.equal(session.snapshot().lastValidationReport.valid, true);
    assert.equal(session.getSourceData().items.some((brochure) => brochure.id === draft.id), true);
  });

  await runCheck("exportstatus blijft overdrachtsstatus zonder publicatieclaim", () => {
    const session = createBrochureSession(brochures, suppliers);
    const exportResult = session.prepareExport();
    session.markExported(exportResult.report);

    const snapshot = session.snapshot();
    assert.equal(snapshot.exportedCurrent, true);
    assert.equal(snapshot.exportStatus, "exported_unconfirmed");
    assert.equal(snapshot.lastExport.fileName, "brochures.json");
    assert.equal(snapshot.hasUnexportedChanges, false);
  });

  await runCheck("sessie vindt items op slug en id en beschermt interne state", () => {
    const session = createBrochureSession(brochures, suppliers);
    const brochure = firstBrochure(brochures);

    assert.equal(session.findBySlug(brochure.slug).id, brochure.id);
    assert.equal(session.findById(brochure.id).slug, brochure.slug);

    const snapshot = session.snapshot();
    snapshot.lastValidationReport.errors.push({ path: "test", message: "mutatie" });
    assert.equal(session.snapshot().lastValidationReport.errors.length, 0);

    const found = session.findBySlug(brochure.slug);
    found.title = "Mutatie buiten sessie";
    assert.notEqual(session.findBySlug(brochure.slug).title, "Mutatie buiten sessie");
  });

  await runCheck("sessie valideert tegen actuele leveranciersdata", () => {
    let supplierData = clone(suppliers);
    const session = createBrochureSession(brochures, () => supplierData);
    supplierData.items.push({
      ...supplierData.items[0],
      id: "supplier-test",
      name: "Testleverancier",
      slug: "testleverancier"
    });
    session.applyBrochure(
      {
        ...firstBrochure(brochures),
        id: "brochure-test",
        title: "Testbrochure",
        supplierId: "supplier-test",
        slug: "testbrochure",
        status: "concept",
        thumbnail: "",
        pdfFile: "",
        sortOrder: 30
      },
      ""
    );

    assert.equal(session.snapshot().lastValidationReport.valid, true);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBrochureChecks()
    .then(() => {
      console.log("Brochure checks voltooid.");
    })
    .catch((error) => {
      console.error(`Brochure checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
