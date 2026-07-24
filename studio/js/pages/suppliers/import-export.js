import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { validateSupplierFile } from "../../../../shared/supplier-file-validation.js";
import { SUPPLIERS_EXPORT_FILENAME } from "../../../../shared/supplier-normalizer.js";

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

function isJsonFile(file) {
  if (!file) return false;
  const name = String(file.name || "").toLowerCase();
  const type = String(file.type || "").toLowerCase();
  return name.endsWith(".json") || type === "application/json" || type.endsWith("+json");
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Bestand kon niet worden gelezen.")));
    reader.readAsText(file);
  });
}

function downloadTextFile({ fileName, content, type }) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function confirmReplaceUnexportedChanges(snapshot, actionLabel) {
  if (!snapshot.hasUnexportedChanges) return true;

  return confirmStudioAction({
    title: `${actionLabel} vervangt niet-geëxporteerde wijzigingen`,
    message:
      "Er staan wijzigingen in de actieve werksessie die nog niet zijn geëxporteerd. Deze actie kan die wijzigingen vervangen. Wil je doorgaan?"
  });
}

async function handleImportFile({ file, supplierSession, rerender }) {
  if (!file) return;

  if (!isJsonFile(file)) {
    supplierSession.setValidationReport({
      ...createErrorReport("import.file", "Kies een JSON-bestand met de extensie .json."),
      action: "import",
      sourceFileName: file.name || "onbekend bestand"
    });
    rerender();
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(await readFileAsText(file));
  } catch (error) {
    supplierSession.setValidationReport(
      {
        ...createErrorReport("import.json", `Ongeldige JSON. De actieve werksessie is niet gewijzigd. ${error.message}`),
        action: "import",
        sourceFileName: file.name
      }
    );
    rerender();
    return;
  }

  const report = {
    ...validateSupplierFile(parsed),
    action: "import",
    sourceFileName: file.name
  };
  if (!report.valid) {
    supplierSession.setValidationReport(report);
    rerender();
    return;
  }

  supplierSession.importSource(parsed, file.name, report);
  rerender();
}

export function setupSupplierImportExport({ supplierSession, rerender = () => {} }) {
  const importButton = document.querySelector("[data-supplier-import-button]");
  const importInput = document.querySelector("[data-supplier-import-file]");
  const exportButton = document.querySelector("[data-supplier-export-button]");
  const restoreButton = document.querySelector("[data-supplier-restore]");
  let importConfirmed = false;

  importButton?.addEventListener("click", () => {
    if (!confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Importeren")) {
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

    if (!importConfirmed && !confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Importeren")) {
      importInput.value = "";
      return;
    }

    importConfirmed = false;
    await handleImportFile({ file, supplierSession, rerender });
  });

  exportButton?.addEventListener("click", () => {
    const exportResult = supplierSession.prepareExport();

    if (!exportResult.ok) {
      rerender();
      return;
    }

    downloadTextFile({
      fileName: SUPPLIERS_EXPORT_FILENAME,
      content: exportResult.json,
      type: "application/json;charset=utf-8"
    });
    supplierSession.markExported(exportResult.report);
    rerender();
  });

  restoreButton?.addEventListener("click", () => {
    if (!confirmReplaceUnexportedChanges(supplierSession.snapshot(), "Sessie herstellen")) {
      return;
    }

    supplierSession.restoreSource();
    rerender();
  });
}
