import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { routeFromHash } from "../shared/routes.js";
import { STUDIO_CONFIG } from "../shared/config.js";
import { createSupplierSession } from "../studio/js/state/supplier-session.js";
import { renderSuppliersList } from "../studio/js/pages/suppliers/list.js";
import { getRouteTitle } from "../studio/js/router.js";
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

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

async function runStudioChecks() {
  const suppliers = readJson("data/suppliers.json");

  await runCheck("basis JSON-bestanden zijn geldig", () => {
    readJson("data/suppliers.json");
    readJson("data/studio-navigation.json");
    readJson("data/studio-dashboard.json");
  });

  await runCheck("Studio modules importeren zonder side effects", async () => {
    await import("../shared/routes.js");
    await import("../shared/supplier-file-validation.js");
    await import("../shared/supplier-normalizer.js");
    await import("../studio/js/router.js");
    await import("../studio/js/route-focus.js");
    await import("../studio/js/pages/suppliers/form.js");
    await import("../studio/js/pages/suppliers/import-export.js");
    await import("../components/confirm-dialog.js");
  });

  await runCheck("route helpers geven expliciete routes terug", () => {
    assert.equal(routeFromHash("#/dashboard").id, "dashboard");
    assert.equal(routeFromHash("#/leveranciers").id, "suppliers");
    assert.equal(routeFromHash("#/leveranciers/nieuw").id, "supplierNew");
    assert.equal(routeFromHash("#/leveranciers/amefa").id, "supplierDetail");
    assert.equal(routeFromHash("#/leveranciers/amefa/bewerken").id, "supplierEdit");
    assert.equal(routeFromHash("#/bestaat-niet").id, "notFound");
  });

  await runCheck("route titles en document title helper werken", async () => {
    const supplierSession = createSupplierSession(suppliers);
    const state = { supplierSession };
    assert.equal(getRouteTitle(routeFromHash("#/leveranciers/amefa"), state), "Amefa");
    assert.equal(getRouteTitle(routeFromHash("#/leveranciers/onbekend"), state), "Leverancier niet gevonden");

    globalThis.document = { title: "" };
    const { applyRouteTitle } = await import("../studio/js/route-focus.js");
    applyRouteTitle("Leveranciers");
    assert.equal(globalThis.document.title, `Leveranciers – ${STUDIO_CONFIG.appName}`);
    delete globalThis.document;
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

  await runSupplierChecks();
}

runStudioChecks()
  .then(() => {
    console.log("Studio checks voltooid.");
  })
  .catch((error) => {
    console.error(`Studio checks mislukt: ${error.message}`);
    process.exitCode = 1;
  });
