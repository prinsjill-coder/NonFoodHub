import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { CONTENT_STATUSES, CONTENT_STATUS_LABELS } from "../shared/content-status.js";
import { validateBrochureFile } from "../shared/brochure-file-validation.js";
import { normalizeBrochureFileForSession, stableStringify } from "../shared/brochure-normalizer.js";
import { validateBrochure } from "../shared/brochure-validation.js";
import { createBrochureSession } from "../studio/js/state/brochure-session.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
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
    firstBrochure(data).pdfFile = "/Users/jillprins/voorbeeld.pdf";
    expectInvalid(data, suppliers, "items[0].pdfFile");

    data = clone(brochures);
    firstBrochure(data).thumbnail = "file:///voorbeeld.jpg";
    expectInvalid(data, suppliers, "items[0].thumbnail");

    data = clone(brochures);
    firstBrochure(data).pdfFile = "assets/downloads/brochures/voorbeeld.docx";
    expectInvalid(data, suppliers, "items[0].pdfFile");
  });

  await runCheck("pdfFile is optioneel bij concept en verplicht bij review of published", () => {
    let data = clone(brochures);
    firstBrochure(data).status = "concept";
    firstBrochure(data).pdfFile = "";
    assert.equal(validateBrochureFile(data, suppliers).valid, true);

    data = clone(brochures);
    firstBrochure(data).status = "review";
    firstBrochure(data).pdfFile = "";
    expectInvalid(data, suppliers, "items[0].pdfFile");

    data = clone(brochures);
    firstBrochure(data).status = "published";
    firstBrochure(data).pdfFile = "";
    expectInvalid(data, suppliers, "items[0].pdfFile");
  });

  await runCheck("thumbnail is verplicht bij published maar niet bij review", () => {
    let data = clone(brochures);
    firstBrochure(data).status = "review";
    firstBrochure(data).thumbnail = "";
    assert.equal(validateBrochureFile(data, suppliers).valid, true);

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
