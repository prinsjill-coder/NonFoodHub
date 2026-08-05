import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { validateSupplierFile } from "../../../../shared/supplier-file-validation.js";
import { SUPPLIERS_EXPORT_FILENAME } from "../../../../shared/supplier-normalizer.js";
import {
  createBusyGuard,
  downloadTextFile,
  readJsonFile,
  validateFileSelection
} from "../../shared/import-export-file.js";

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

function hasJsonMimeSignal(file) {
  const type = String(file.type || "").toLowerCase();
  return type === "application/json" || type.endsWith("+json");
}

export function validateSupplierImportFile(file) {
  const fileValidation = validateFileSelection(file, {
    maxBytes: MAX_SUPPLIER_IMPORT_BYTES,
    extension: ".json"
  });

  if (fileValidation.code === "missing_file") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Geen bestand geselecteerd. Kies een gegevensbestand (.json). De bewerkversie is niet gewijzigd.",
        "geen bestand"
      )
    };
  }

  if (fileValidation.code === "invalid_extension") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Kies een gegevensbestand met de extensie .json. De bewerkversie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  if (fileValidation.code === "file_too_large") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Het bestand is groter dan 1 MB. Kies een kleiner suppliers.json-bestand. De bewerkversie is niet gewijzigd.",
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

export function createSupplierExportGuard() {
  return createBusyGuard();
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
  if (error?.code === "read_aborted") {
    return createImportReport(
      "import.read",
      "Het lezen van het bestand is afgebroken. De bewerkversie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  if (error?.code === "read_failed") {
    return createImportReport(
      "import.read",
      "Het bestand kon niet worden gelezen. De bewerkversie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  return createImportReport(
    "import.json",
    "Het bestand heeft niet het verwachte gegevensformaat. De bewerkversie is niet gewijzigd.",
    fileName || "onbekend bestand"
  );
}

async function confirmReplaceUnexportedChanges(snapshot, actionLabel) {
  if (!snapshot.hasUnexportedChanges) return true;

  return confirmStudioAction({
    title: `${actionLabel} vervangt wijzigingen die nog niet zijn geëxporteerd`,
    message:
      "Er staan wijzigingen in de bewerkversie die nog niet zijn geexporteerd. Deze actie kan die wijzigingen vervangen. Wil je doorgaan?",
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
    parsed = await readJsonFile(file);
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

  await supplierSession.importSource(parsed, file.name, report);
  rerenderAndFocusReport(rerender);
}

export function setupSupplierImportExport({ supplierSession, rerender = () => {}, restoreDraft }) {
  const importButton = document.querySelector("[data-supplier-import-button]");
  const importInput = document.querySelector("[data-supplier-import-file]");
  const exportButton = document.querySelector("[data-supplier-export-button]");
  const restoreButton = document.querySelector("[data-supplier-restore]");
  let importConfirmed = false;
  const exportGuard = createSupplierExportGuard();

  importButton?.addEventListener("click", async () => {
    if (!(await confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Gegevens importeren"))) {
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

    if (!importConfirmed && !(await confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Gegevens importeren"))) {
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
      setButtonBusy(exportButton, true, "Gegevens exporteren");

      try {
        let exportResult;
        try {
          exportResult = supplierSession.prepareExport();
        } catch {
          supplierSession.setValidationReport(
            createExportReport(
              "export.serialize",
              "Export kon niet worden voorbereid. De bewerkversie is niet gewijzigd."
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
              "De download kon niet worden gestart. De bewerkversie is niet gewijzigd."
            )
          );
          rerenderAndFocusReport(rerender);
          return;
        }

        await supplierSession.markExported(exportResult.report);
        rerenderAndFocusReport(rerender);
      } finally {
        setButtonBusy(exportButton, false, "Gegevens exporteren");
      }
    });
  });

  restoreButton?.addEventListener("click", async () => {
    if (!(await confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Bewerkversie herstellen"))) {
      return;
    }

    if (restoreDraft) {
      await restoreDraft();
    } else {
      supplierSession.restoreSource();
    }
    rerender();
  });
}
