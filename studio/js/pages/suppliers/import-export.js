import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { validateSupplierFile } from "../../../../shared/supplier-file-validation.js";
import { SUPPLIERS_EXPORT_FILENAME } from "../../../../shared/supplier-normalizer.js";

export const MAX_SUPPLIER_IMPORT_BYTES = 1024 * 1024;

function createIssue(path, message) {
  return { path, message };
}

function createErrorReport(path, message) {
  return {
    valid: false,
    errors: [createIssue(path, message)],
    warnings: []
  };
}

function createImportReport(path, message, sourceFileName = "onbekend bestand") {
  return {
    ...createErrorReport(path, message),
    action: "import",
    sourceFileName
  };
}

function createExportReport(path, message) {
  return {
    ...createErrorReport(path, message),
    action: "export",
    sourceFileName: SUPPLIERS_EXPORT_FILENAME
  };
}

function hasJsonExtension(file) {
  const name = String(file.name || "").toLowerCase();
  return name.endsWith(".json");
}

function hasJsonMimeSignal(file) {
  const type = String(file.type || "").toLowerCase();
  return type === "application/json" || type.endsWith("+json");
}

export function validateSupplierImportFile(file) {
  if (!file) {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Geen bestand geselecteerd. Kies een .json-bestand. De actieve werksessie is niet gewijzigd.",
        "geen bestand"
      )
    };
  }

  if (!hasJsonExtension(file)) {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Kies een bestand met de extensie .json. De actieve werksessie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  if (typeof file.size === "number" && file.size > MAX_SUPPLIER_IMPORT_BYTES) {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Het bestand is groter dan 1 MB. Kies een kleiner suppliers.json-bestand. De actieve werksessie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  return {
    ok: true,
    mimeTypeChecked: true,
    mimeTypeLooksJson: hasJsonMimeSignal(file)
  };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("abort", () => reject(new Error("aborted")));
    reader.addEventListener("error", () => reject(new Error("read_failed")));
    reader.readAsText(file);
  });
}

function downloadTextFile({ fileName, content, type }) {
  let url = "";
  let link = null;

  try {
    const blob = new Blob([content], { type });
    url = URL.createObjectURL(blob);
    link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
  } finally {
    link?.remove();
    if (url) {
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}

export function createSupplierExportGuard() {
  let busy = false;

  return {
    isBusy() {
      return busy;
    },
    async run(task) {
      if (busy) return { skipped: true };
      busy = true;

      try {
        const result = await task();
        return { skipped: false, result };
      } finally {
        busy = false;
      }
    }
  };
}

function focusValidationReport() {
  window.requestAnimationFrame(() => {
    const report = document.querySelector("[data-validation-report]");
    if (!report) return;

    if (!report.hasAttribute("tabindex")) {
      report.setAttribute("tabindex", "-1");
    }

    report.focus({ preventScroll: false });
  });
}

function rerenderAndFocusReport(rerender) {
  rerender();
  focusValidationReport();
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
  button.setAttribute("aria-busy", busy ? "true" : "false");
  button.textContent = busy ? `${label}...` : label;
}

function readErrorReport(error, fileName) {
  if (error?.message === "aborted") {
    return createImportReport(
      "import.read",
      "Het lezen van het bestand is afgebroken. De actieve werksessie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  if (error?.message === "read_failed") {
    return createImportReport(
      "import.read",
      "Het bestand kon niet worden gelezen. De actieve werksessie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  return createImportReport(
    "import.json",
    "Ongeldige JSON. Controleer of het bestand volledige JSON bevat. De actieve werksessie is niet gewijzigd.",
    fileName || "onbekend bestand"
  );
}

async function confirmReplaceUnexportedChanges(snapshot, actionLabel) {
  if (!snapshot.hasUnexportedChanges) return true;

  return confirmStudioAction({
    title: `${actionLabel} vervangt niet-geëxporteerde wijzigingen`,
    message:
      "Er staan wijzigingen in de actieve werksessie die nog niet zijn geëxporteerd. Deze actie kan die wijzigingen vervangen. Wil je doorgaan?",
    confirmLabel: "Doorgaan",
    cancelLabel: "Annuleren"
  });
}

async function handleImportFile({ file, supplierSession, rerender }) {
  const fileValidation = validateSupplierImportFile(file);

  if (!fileValidation.ok) {
    supplierSession.setValidationReport(fileValidation.report);
    rerenderAndFocusReport(rerender);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(await readFileAsText(file));
  } catch (error) {
    supplierSession.setValidationReport(readErrorReport(error, file.name));
    rerenderAndFocusReport(rerender);
    return;
  }

  const report = {
    ...validateSupplierFile(parsed),
    action: "import",
    sourceFileName: file.name
  };
  if (!report.valid) {
    supplierSession.setValidationReport(report);
    rerenderAndFocusReport(rerender);
    return;
  }

  supplierSession.importSource(parsed, file.name, report);
  rerenderAndFocusReport(rerender);
}

export function setupSupplierImportExport({ supplierSession, rerender = () => {} }) {
  const importButton = document.querySelector("[data-supplier-import-button]");
  const importInput = document.querySelector("[data-supplier-import-file]");
  const exportButton = document.querySelector("[data-supplier-export-button]");
  const restoreButton = document.querySelector("[data-supplier-restore]");
  let importConfirmed = false;
  const exportGuard = createSupplierExportGuard();

  importButton?.addEventListener("click", async () => {
    if (!(await confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Importeren"))) {
      return;
    }

    importConfirmed = true;
    if (importInput) {
      importInput.value = "";
      importInput.click();
    }
  });

  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];

    if (!importConfirmed && !(await confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Importeren"))) {
      importInput.value = "";
      return;
    }

    importConfirmed = false;
    await handleImportFile({ file, supplierSession, rerender });
    importInput.value = "";
  });

  exportButton?.addEventListener("click", async () => {
    if (exportGuard.isBusy()) return;

    await exportGuard.run(async () => {
      setButtonBusy(exportButton, true, "Export");

      try {
        let exportResult;
        try {
          exportResult = supplierSession.prepareExport();
        } catch {
          supplierSession.setValidationReport(
            createExportReport(
              "export.serialize",
              "Export kon niet worden voorbereid. De actieve werksessie is niet gewijzigd."
            )
          );
          rerenderAndFocusReport(rerender);
          return;
        }

        if (!exportResult.ok) {
          rerenderAndFocusReport(rerender);
          return;
        }

        try {
          downloadTextFile({
            fileName: SUPPLIERS_EXPORT_FILENAME,
            content: exportResult.json,
            type: "application/json;charset=utf-8"
          });
        } catch {
          supplierSession.setValidationReport(
            createExportReport(
              "export.download",
              "De download kon niet worden gestart. De actieve werksessie is niet gewijzigd."
            )
          );
          rerenderAndFocusReport(rerender);
          return;
        }

        supplierSession.markExported(exportResult.report);
        rerenderAndFocusReport(rerender);
      } finally {
        setButtonBusy(exportButton, false, "Export");
      }
    });
  });

  restoreButton?.addEventListener("click", async () => {
    if (!(await confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Sessie herstellen"))) {
      return;
    }

    supplierSession.restoreSource();
    rerender();
  });
}
