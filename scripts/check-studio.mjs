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
import { createSupplierSession } from "../studio/js/state/supplier-session.js";
import { renderValidationSummary } from "../components/validation-summary.js";
import { clearFieldErrors, focusFirstInvalidField, setFieldErrors } from "../studio/js/shared/form-errors.js";
import { downloadTextFile, readJsonFile, validateFileSelection } from "../studio/js/shared/import-export-file.js";
import { renderRouteNotFound } from "../studio/js/pages/dashboard.js";
import { renderSuppliersList } from "../studio/js/pages/suppliers/list.js";
import { renderSuppliersRoute } from "../studio/js/pages/suppliers/index.js";
import { getRouteTitle, renderRoute } from "../studio/js/router.js";
import { createFormDirtyGuard } from "../studio/js/form-dirty-guard.js";
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

  await runCheck("basis JSON-bestanden zijn geldig", () => {
    readJson("data/suppliers.json");
    readJson("data/studio-navigation.json");
    readJson("data/studio-dashboard.json");
  });

  await runCheck("Studio modules importeren zonder side effects", async () => {
    await import("../shared/routes.js");
    await import("../shared/content-status.js");
    await import("../shared/supplier-file-validation.js");
    await import("../shared/supplier-normalizer.js");
    await import("../studio/js/shared/form-errors.js");
    await import("../studio/js/shared/import-export-file.js");
    await import("../studio/js/shared/not-found.js");
    await import("../studio/js/shared/route-metadata.js");
    await import("../studio/js/router.js");
    await import("../studio/js/route-focus.js");
    await import("../studio/js/pages/suppliers/form.js");
    await import("../studio/js/pages/suppliers/import-export.js");
    await import("../components/confirm-dialog.js");
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
    const state = {
      dashboard: readJson("data/studio-dashboard.json"),
      supplierSession
    };

    assert.match(renderRoute(routeFromHash("#/leveranciers"), state), /Leveranciers/);
    assert.match(renderRoute(routeFromHash("#/leveranciers/amefa"), state), /Amefa/);
    assert.match(renderRoute(routeFromHash("#/leveranciers/amefa/bewerken"), state), /Amefa bewerken/);
    assert.match(renderRoute(routeFromHash("#/leveranciers/nieuw"), state), /Nieuwe leverancier/);
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
    const genericHtml = renderRouteNotFound(routeFromHash("#/bestaat-niet"));
    const supplierHtml = renderSuppliersRoute(routeFromHash("#/leveranciers/bestaat-niet"), supplierSession);

    assert.match(genericHtml, /Pagina niet gevonden/);
    assert.match(genericHtml, /Terug naar dashboard/);
    assert.match(supplierHtml, /Leverancier niet gevonden/);
    assert.match(supplierHtml, /Terug naar leveranciers/);
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
}

runStudioChecks()
  .then(() => {
    console.log("Studio checks voltooid.");
  })
  .catch((error) => {
    console.error(`Studio checks mislukt: ${error.message}`);
    process.exitCode = 1;
  });
