import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { validateBrochureFile } from "../../../../shared/brochure-file-validation.js";
import { getBrochures } from "../../../../shared/brochure-model.js";
import { BROCHURES_EXPORT_FILENAME } from "../../../../shared/brochure-normalizer.js";
import {
  createBusyGuard,
  downloadTextFile,
  readJsonFile,
  validateFileSelection
} from "../../shared/import-export-file.js";

export const MAX_BROCHURE_IMPORT_BYTES = 1024 * 1024;

function createIssue(path, message) {
  return { path, message };
}

function createErrorReport(path, message, sourceFileName = "onbekend bestand") {
  return {
    valid: false,
    errors: [createIssue(path, message)],
    warnings: [],
    sourceFileName
  };
}

function createImportReport(path, message, sourceFileName = "onbekend bestand") {
  return {
    ...createErrorReport(path, message, sourceFileName),
    action: "import"
  };
}

function createExportReport(path, message) {
  return {
    ...createErrorReport(path, message, BROCHURES_EXPORT_FILENAME),
    action: "export"
  };
}

export function validateBrochureImportFile(file) {
  const fileValidation = validateFileSelection(file, {
    maxBytes: MAX_BROCHURE_IMPORT_BYTES,
    extension: ".json"
  });

  if (fileValidation.code === "missing_file") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Geen bestand geselecteerd. Kies een .json-bestand. De actieve brochurewerksessie is niet gewijzigd.",
        "geen bestand"
      )
    };
  }

  if (fileValidation.code === "invalid_extension") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Kies een bestand met de extensie .json. De actieve brochurewerksessie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  if (fileValidation.code === "file_too_large") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Het bestand is groter dan 1 MB. Kies een kleiner brochures.json-bestand. De actieve brochurewerksessie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  return { ok: true };
}

export function createBrochureExportGuard() {
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
      "Het lezen van het bestand is afgebroken. De actieve brochurewerksessie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  if (error?.code === "read_failed") {
    return createImportReport(
      "import.read",
      "Het bestand kon niet worden gelezen. De actieve brochurewerksessie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  return createImportReport(
    "import.json",
    "Ongeldige JSON. Controleer of het bestand volledige JSON bevat. De actieve brochurewerksessie is niet gewijzigd.",
    fileName || "onbekend bestand"
  );
}

function createValidatedImportReport(parsed, supplierData, fileName) {
  return {
    ...validateBrochureFile(parsed, supplierData),
    action: "import",
    sourceFileName: fileName,
    itemCount: getBrochures(parsed).length
  };
}

async function confirmBrochureImport(report, snapshot) {
  const dirtyMessage = snapshot.dirty
    ? " De actieve brochurewerksessie wijkt af van de geladen bron en wordt vervangen als je doorgaat."
    : "";

  return confirmStudioAction({
    title: "Brochurebestand importeren?",
    message: `${report.sourceFileName} bevat ${report.itemCount} brochures. Importeren vervangt alleen de actieve browserwerksessie, schrijft niets naar de repository en publiceert niets.${dirtyMessage}`,
    confirmLabel: "Importeren",
    cancelLabel: "Annuleren",
    tone: "warning"
  });
}

async function handleImportFile({ file, brochureSession, supplierSession, rerender }) {
  const fileValidation = validateBrochureImportFile(file);

  if (!fileValidation.ok) {
    brochureSession.setValidationReport(fileValidation.report);
    rerenderAndFocusReport(rerender);
    return;
  }

  let parsed;
  try {
    parsed = await readJsonFile(file);
  } catch (error) {
    brochureSession.setValidationReport(readErrorReport(error, file.name));
    rerenderAndFocusReport(rerender);
    return;
  }

  const report = createValidatedImportReport(parsed, supplierSession.getWorkingData(), file.name);
  brochureSession.setValidationReport(report);
  rerenderAndFocusReport(rerender);

  if (!report.valid) return;

  if (!(await confirmBrochureImport(report, brochureSession.snapshot()))) {
    return;
  }

  brochureSession.importSource(parsed, file.name, report);
  rerenderAndFocusReport(rerender);
}

export function setupBrochureImportExport({ brochureSession, supplierSession, rerender = () => {} }) {
  const importButton = document.querySelector("[data-brochure-import-button]");
  const importInput = document.querySelector("[data-brochure-import-file]");
  const exportButton = document.querySelector("[data-brochure-export-button]");
  const exportGuard = createBrochureExportGuard();

  importButton?.addEventListener("click", () => {
    if (importInput) {
      importInput.value = "";
      importInput.click();
    }
  });

  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    await handleImportFile({ file, brochureSession, supplierSession, rerender });
    importInput.value = "";
  });

  exportButton?.addEventListener("click", async () => {
    if (exportGuard.isBusy()) return;

    await exportGuard.run(async () => {
      setButtonBusy(exportButton, true, "Exporteren");

      try {
        let exportResult;
        try {
          exportResult = brochureSession.prepareExport();
        } catch {
          brochureSession.setValidationReport(
            createExportReport(
              "export.serialize",
              "Export kon niet worden voorbereid. De actieve brochurewerksessie is niet gewijzigd."
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
            fileName: BROCHURES_EXPORT_FILENAME,
            content: exportResult.json,
            type: "application/json;charset=utf-8"
          });
        } catch {
          brochureSession.setValidationReport(
            createExportReport(
              "export.download",
              "De download kon niet worden gestart. De actieve brochurewerksessie is niet gewijzigd."
            )
          );
          rerenderAndFocusReport(rerender);
          return;
        }

        brochureSession.markExported(exportResult.report);
        rerenderAndFocusReport(rerender);
      } finally {
        setButtonBusy(exportButton, false, "Exporteren");
      }
    });
  });
}
