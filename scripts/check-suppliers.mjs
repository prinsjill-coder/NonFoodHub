import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { CONTENT_STATUSES, CONTENT_STATUS_LABELS } from "../shared/content-status.js";
import { validateSupplierFile } from "../shared/supplier-file-validation.js";
import { SUPPLIERS_EXPORT_FILENAME } from "../shared/supplier-normalizer.js";
import { validateSupplier } from "../shared/supplier-validation.js";
import {
  MAX_SUPPLIER_IMPORT_BYTES,
  createSupplierExportGuard,
  validateSupplierImportFile
} from "../studio/js/pages/suppliers/import-export.js";
import { createSupplierSession } from "../studio/js/state/supplier-session.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function firstSupplier(data) {
  return data.items[0];
}

function secondSupplier(data) {
  return data.items[1];
}

function expectInvalid(data, expectedPath) {
  const report = validateSupplierFile(data);
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

export async function runSupplierChecks() {
  const suppliers = readJson("data/suppliers.json");

  await runCheck("suppliers.json is geldige JSON en valideert volledig", () => {
    const report = validateSupplierFile(suppliers);
    assert.equal(report.valid, true);
    assert.deepEqual(report.errors, []);
  });

  await runCheck("suppliervalidatie gebruikt centrale contentstatussen", () => {
    assert.deepEqual(suppliers.statuses, CONTENT_STATUSES);
    CONTENT_STATUSES.forEach((status) => {
      assert.equal(typeof CONTENT_STATUS_LABELS[status], "string");
    });

    const supplier = {
      ...firstSupplier(suppliers),
      status: "ongeldig"
    };
    const errors = validateSupplier(supplier, suppliers.items, { originalSlug: supplier.slug });
    assert.equal(errors.status, "Kies een geldige status.");
  });

  await runCheck("dubbele id wordt geblokkeerd", () => {
    const data = clone(suppliers);
    secondSupplier(data).id = firstSupplier(data).id;
    expectInvalid(data, "items[1].id");
  });

  await runCheck("dubbele genormaliseerde slug wordt geblokkeerd", () => {
    const data = clone(suppliers);
    secondSupplier(data).slug = firstSupplier(data).slug;
    expectInvalid(data, "items[1].slug");
  });

  await runCheck("ongeldige rootstructuur wordt geblokkeerd", () => {
    const report = validateSupplierFile([]);
    assert.equal(report.valid, false);
    assert.equal(report.errors[0].path, "root");
  });

  await runCheck("lokale absolute paden worden geblokkeerd", () => {
    const data = clone(suppliers);
    firstSupplier(data).logo = "/absolute/voorbeeld.png";
    expectInvalid(data, "items[0].logo");
  });

  await runCheck("onbekende velden waarschuwen maar blokkeren import niet", () => {
    const data = clone(suppliers);
    data.extraRoot = "blijft tijdens sessie zichtbaar";
    firstSupplier(data).extraSupplier = "blijft tijdens sessie zichtbaar";

    const report = validateSupplierFile(data);
    assert.equal(report.valid, true);
    assert.ok(report.warnings.some((warning) => warning.path === "root.extraRoot"));
    assert.ok(report.warnings.some((warning) => warning.path === "items[0].extraSupplier"));
  });

  await runCheck("importbestandcontrole gebruikt 1 MB limiet en .json extensie", () => {
    assert.equal(validateSupplierImportFile(null).ok, false);
    assert.equal(validateSupplierImportFile({ name: "suppliers.txt", size: 10, type: "application/json" }).ok, false);
    assert.equal(validateSupplierImportFile({ name: "suppliers.json", size: MAX_SUPPLIER_IMPORT_BYTES + 1, type: "" }).ok, false);

    const validPlainJson = validateSupplierImportFile({
      name: "suppliers.json",
      size: MAX_SUPPLIER_IMPORT_BYTES,
      type: "text/plain"
    });
    assert.equal(validPlainJson.ok, true);
    assert.equal(validPlainJson.mimeTypeLooksJson, false);
  });

  await runCheck("sessie start schoon en wordt dirty na wijziging", () => {
    const session = createSupplierSession(suppliers);
    assert.equal(session.snapshot().dirty, false);

    const supplier = firstSupplier(suppliers);
    session.applySupplier({ ...supplier, name: `${supplier.name} Test` }, supplier.slug);
    const snapshot = session.snapshot();
    assert.equal(snapshot.dirty, true);
    assert.equal(snapshot.hasUnexportedChanges, true);
  });

  await runCheck("restore zet workingData terug naar de laatst geladen bron", () => {
    const session = createSupplierSession(suppliers);
    const supplier = firstSupplier(suppliers);
    session.applySupplier({ ...supplier, name: `${supplier.name} Test` }, supplier.slug);
    session.restoreSource();

    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.findBySlug(supplier.slug).name, supplier.name);
  });

  await runCheck("sessie kan conceptleverancier definitief verwijderen uit de bewerkversie", () => {
    const source = clone(suppliers);
    const draft = {
      ...firstSupplier(source),
      id: "supplier-delete-check",
      name: "Delete check leverancier",
      slug: "delete-check-leverancier",
      status: "concept",
      sortOrder: 999
    };
    source.items.push(draft);
    const session = createSupplierSession(source);

    assert.equal(session.findBySlug(draft.slug).id, draft.id);
    session.deleteSupplier(draft.slug);

    assert.equal(session.findBySlug(draft.slug), null);
    assert.equal(session.snapshot().dirty, true);
    assert.equal(session.snapshot().lastValidationReport.valid, true);
    assert.equal(session.getSourceData().items.some((supplier) => supplier.id === draft.id), true);
  });

  await runCheck("succesvolle import wordt nieuwe bron met dirty=false", () => {
    const session = createSupplierSession(suppliers);
    const imported = clone(suppliers);
    imported.items.push({
      ...firstSupplier(imported),
      id: "supplier-test",
      name: "Testleverancier",
      slug: "testleverancier",
      sortOrder: 30,
      status: "concept"
    });

    session.importSource(imported, SUPPLIERS_EXPORT_FILENAME, validateSupplierFile(imported));
    const snapshot = session.snapshot();
    assert.equal(snapshot.sourceType, "imported");
    assert.equal(snapshot.sourceFileName, SUPPLIERS_EXPORT_FILENAME);
    assert.equal(snapshot.dirty, false);
    assert.equal(snapshot.supplierCount, imported.items.length);
  });

  await runCheck("mislukte importmelding muteert de werksessie niet", () => {
    const session = createSupplierSession(suppliers);
    const before = JSON.stringify(session.getWorkingData());
    session.setValidationReport({
      valid: false,
      errors: [{ path: "import.json", message: "Ongeldige JSON." }],
      warnings: [],
      action: "import",
      sourceFileName: "kapot.json"
    });
    assert.equal(JSON.stringify(session.getWorkingData()), before);
    assert.equal(session.snapshot().dirty, false);
  });

  await runCheck("export muteert workingData niet en behoudt bestandsnaam", () => {
    const session = createSupplierSession(suppliers);
    const before = JSON.stringify(session.getWorkingData());
    const exportResult = session.prepareExport();

    assert.equal(exportResult.ok, true);
    assert.equal(exportResult.fileName, SUPPLIERS_EXPORT_FILENAME);
    assert.deepEqual(exportResult.data.statuses, CONTENT_STATUSES);
    assert.equal(JSON.stringify(session.getWorkingData()), before);
  });

  await runCheck("snapshots en gevonden leveranciers zijn immutable", () => {
    const session = createSupplierSession(suppliers);
    const snapshot = session.snapshot();
    snapshot.lastValidationReport.errors.push({ path: "test", message: "mutatie" });
    assert.equal(session.snapshot().lastValidationReport.errors.length, 0);

    const supplier = session.findBySlug(firstSupplier(suppliers).slug);
    supplier.name = "Mutatie buiten sessie";
    assert.notEqual(session.findBySlug(firstSupplier(suppliers).slug).name, "Mutatie buiten sessie");
  });

  await runCheck("onbekende velden blijven in workingData en verdwijnen alleen bij export", () => {
    const data = clone(suppliers);
    data.extraRoot = "tijdelijk";
    firstSupplier(data).extraSupplier = "tijdelijk";

    const session = createSupplierSession(suppliers);
    session.importSource(data, SUPPLIERS_EXPORT_FILENAME, validateSupplierFile(data));
    assert.equal(session.getWorkingData().extraRoot, "tijdelijk");
    assert.equal(session.getWorkingData().items[0].extraSupplier, "tijdelijk");

    const exportResult = session.prepareExport();
    assert.equal(exportResult.ok, true);
    assert.equal("extraRoot" in exportResult.data, false);
    assert.equal("extraSupplier" in exportResult.data.items[0], false);
  });

  await runCheck("exportstatus na markExported blijft overdrachtsstatus", () => {
    const session = createSupplierSession(suppliers);
    const exportResult = session.prepareExport();
    session.markExported(exportResult.report);

    const snapshot = session.snapshot();
    assert.equal(snapshot.exportedCurrent, true);
    assert.equal(snapshot.exportStatus, "exported_unconfirmed");
    assert.equal(snapshot.lastExport.fileName, SUPPLIERS_EXPORT_FILENAME);
  });

  await runCheck("dubbele export wordt door guard overgeslagen", async () => {
    const guard = createSupplierExportGuard();
    let release;
    const firstRun = guard.run(() => new Promise((resolve) => {
      release = () => resolve("eerste export klaar");
    }));

    assert.equal(guard.isBusy(), true);
    const secondRun = await guard.run(() => "tweede export");
    assert.equal(secondRun.skipped, true);

    release();
    const firstResult = await firstRun;
    assert.equal(firstResult.skipped, false);
    assert.equal(firstResult.result, "eerste export klaar");
    assert.equal(guard.isBusy(), false);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSupplierChecks()
    .then(() => {
      console.log("Supplier checks voltooid.");
    })
    .catch((error) => {
      console.error(`Supplier checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
