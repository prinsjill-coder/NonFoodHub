import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { validateArticleImportData } from "../../../../shared/article-import.js";
import {
  readJsonFile,
  validateFileSelection
} from "../../shared/import-export-file.js";

export const MAX_ARTICLE_IMPORT_BYTES = 1024 * 1024;

function createIssue(path, message) {
  return { path, message };
}

function createImportReport(path, message, sourceFileName = "onbekend bestand") {
  return {
    valid: false,
    errors: [createIssue(path, message)],
    warnings: [],
    action: "import",
    sourceFileName
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

function readErrorReport(error, fileName) {
  if (error?.code === "read_aborted") {
    return createImportReport(
      "import.read",
      "Het lezen van het bestand is afgebroken. De actieve kennisbankwerksessie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  if (error?.code === "read_failed") {
    return createImportReport(
      "import.read",
      "Het bestand kon niet worden gelezen. De actieve kennisbankwerksessie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  return createImportReport(
    "import.json",
    "Ongeldige JSON. Controleer of het bestand volledige JSON bevat. De actieve kennisbankwerksessie is niet gewijzigd.",
    fileName || "onbekend bestand"
  );
}

export function validateArticleImportFile(file) {
  const fileValidation = validateFileSelection(file, {
    maxBytes: MAX_ARTICLE_IMPORT_BYTES,
    extension: ".json"
  });

  if (fileValidation.code === "missing_file") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Geen bestand geselecteerd. Kies een .json-bestand. De actieve kennisbankwerksessie is niet gewijzigd.",
        "geen bestand"
      )
    };
  }

  if (fileValidation.code === "invalid_extension") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Kies een bestand met de extensie .json. De actieve kennisbankwerksessie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  if (fileValidation.code === "file_too_large") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Het bestand is groter dan 1 MB. Kies een kleiner articles.json-bestand. De actieve kennisbankwerksessie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  return { ok: true };
}

async function confirmArticleImport(report, snapshot) {
  const dirtyMessage = snapshot.dirty
    ? " De actieve kennisbankwerksessie wijkt af van de geladen bron en wordt vervangen als je doorgaat."
    : "";

  return confirmStudioAction({
    title: "Artikelbestand importeren?",
    message: `${report.sourceFileName} bevat ${report.itemCount} artikelen. Importeren vervangt alleen de actieve browserwerksessie, schrijft niets naar de repository en publiceert niets.${dirtyMessage}`,
    confirmLabel: "Importeren",
    cancelLabel: "Annuleren",
    tone: "warning"
  });
}

async function handleImportFile({ file, articleSession, supplierSession, brochureSession, mediaSession, rerender }) {
  const fileValidation = validateArticleImportFile(file);

  if (!fileValidation.ok) {
    articleSession.setValidationReport(fileValidation.report);
    rerenderAndFocusReport(rerender);
    return;
  }

  let parsed;
  try {
    parsed = await readJsonFile(file);
  } catch (error) {
    articleSession.setValidationReport(readErrorReport(error, file.name));
    rerenderAndFocusReport(rerender);
    return;
  }

  const report = validateArticleImportData(
    parsed,
    supplierSession.getWorkingData(),
    brochureSession.getWorkingData(),
    mediaSession.getWorkingData(),
    file.name
  );
  articleSession.setValidationReport(report);
  rerenderAndFocusReport(rerender);

  if (!report.valid) return;

  if (!(await confirmArticleImport(report, articleSession.snapshot()))) {
    return;
  }

  articleSession.importSource(parsed, file.name, report);
  rerenderAndFocusReport(rerender);
}

export function setupArticleImport({
  articleSession,
  supplierSession,
  brochureSession,
  mediaSession,
  rerender = () => {}
}) {
  const importButton = document.querySelector("[data-article-import-button]");
  const importInput = document.querySelector("[data-article-import-file]");

  importButton?.addEventListener("click", () => {
    if (importInput) {
      importInput.value = "";
      importInput.click();
    }
  });

  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    await handleImportFile({ file, articleSession, supplierSession, brochureSession, mediaSession, rerender });
    importInput.value = "";
  });
}
