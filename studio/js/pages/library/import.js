import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderFileInput } from "../../../../components/file-input.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderSessionBanner } from "../../../../components/session-banner.js";
import { renderValidationReport } from "../../../../components/validation-report.js";
import { validateLibraryImportData } from "../../../../shared/library-import.js";
import { escapeHtml } from "../../../../shared/utils.js";
import {
  readJsonFile,
  validateFileSelection
} from "../../shared/import-export-file.js";

export const MAX_LIBRARY_IMPORT_BYTES = 1024 * 1024;

function createIssue(path, message) {
  return { path, message };
}

function createImportReport(path, message, sourceFileName = "onbekend bestand") {
  return {
    valid: false,
    errors: [createIssue(path, message)],
    warnings: [],
    action: "import",
    sourceFileName,
    itemCount: 0,
    newItems: 0,
    changedItems: 0,
    unchangedItems: 0
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

export function validateLibraryImportFile(file) {
  const fileValidation = validateFileSelection(file, {
    maxBytes: MAX_LIBRARY_IMPORT_BYTES,
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
        "Het bestand is groter dan 1 MB. Kies een kleiner library.json-bestand. De bewerkversie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  return { ok: true };
}

function renderSessionStatus(snapshot) {
  if (snapshot.exportedCurrent) return "Gegevens geexporteerd, overdracht nog niet bevestigd";
  if (snapshot.hasUnexportedChanges) return "Bibliotheekwijzigingen nog niet geexporteerd";
  if (snapshot.dirty) return "Bibliotheekwijzigingen nog niet opgeslagen";
  return "Gelijk aan het geladen bestand";
}

function renderImportSummary(report) {
  if (report?.action !== "import") return "";

  return `
    <section class="studio-section" aria-label="Importsamenvatting">
      <div class="studio-grid studio-grid-4">
        <article class="studio-card studio-metric-card">
          <h3>Items</h3>
          <p class="studio-metric-value">${Number(report.itemCount || 0)}</p>
          <p class="studio-muted">Aantal items in het geselecteerde gegevensbestand.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Nieuw</h3>
          <p class="studio-metric-value">${Number(report.newItems || 0)}</p>
          <p class="studio-muted">Nog niet aanwezig in de bewerkversie.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Gewijzigd</h3>
          <p class="studio-metric-value">${Number(report.changedItems || 0)}</p>
          <p class="studio-muted">Bestaande id met gewijzigde genormaliseerde inhoud.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Waarschuwingen</h3>
          <p class="studio-metric-value">${Number(report.warnings?.length || 0)}</p>
          <p class="studio-muted">Waarschuwingen blokkeren import niet.</p>
        </article>
      </div>
    </section>
  `;
}

async function confirmLibraryImport(report, snapshot) {
  const dirtyMessage = snapshot.dirty
    ? " De bewerkversie wijkt af van het geladen bestand en wordt vervangen als je doorgaat."
    : "";

  return confirmStudioAction({
    title: "Bibliotheekbestand importeren?",
    message: `${report.sourceFileName} bevat ${report.itemCount} bibliotheekitems. Importeren vervangt alleen de bewerkversie; de website verandert nog niet.${dirtyMessage}`,
    confirmLabel: "Gegevens importeren",
    cancelLabel: "Annuleren",
    tone: "warning"
  });
}

async function handleImportFile({
  file,
  librarySession,
  supplierSession,
  brochureSession,
  articleSession,
  mediaSession,
  rerender
}) {
  const fileValidation = validateLibraryImportFile(file);

  if (!fileValidation.ok) {
    librarySession.setValidationReport(fileValidation.report);
    rerenderAndFocusReport(rerender);
    return;
  }

  let parsed;
  try {
    parsed = await readJsonFile(file);
  } catch (error) {
    librarySession.setValidationReport(readErrorReport(error, file.name));
    rerenderAndFocusReport(rerender);
    return;
  }

  const report = validateLibraryImportData(
    parsed,
    supplierSession.getWorkingData(),
    brochureSession.getWorkingData(),
    articleSession.getWorkingData(),
    mediaSession.getWorkingData(),
    file.name,
    librarySession.getWorkingData()
  );
  librarySession.setValidationReport(report);
  rerenderAndFocusReport(rerender);

  if (!report.valid) return;

  if (!(await confirmLibraryImport(report, librarySession.snapshot()))) {
    return;
  }

  librarySession.importSource(parsed, file.name, report);
  rerenderAndFocusReport(rerender);
}

export function renderLibraryImportPage({ sessionSnapshot }) {
  return `
    ${renderPageHeader({
      eyebrow: "Bibliotheekbeheer",
      title: "Bibliotheekgegevens importeren",
      description: "Controleer een gegevensbestand en laad het alleen in de bewerkversie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar bibliotheek", href: "#/bibliotheek", variant: "secondary" })}
      ${renderButton({ label: "Naar gegevens exporteren", href: "#/bibliotheek/export", variant: "secondary" })}
    </div>

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "library.json",
      sourceDescription:
        "Importeren vervangt alleen de bewerkversie. De website verandert nog niet.",
      exportMessage:
        "De gegevens zijn gedownload. Draag het beheerbestand handmatig over en gebruik daarna Website bijwerken.",
      statusText: renderSessionStatus,
      restoreLabel: "Bewerkversie herstellen",
      restoreAttributes: { "data-library-restore": true }
    })}

    ${renderNotice({
      title: "Importeren is geen publicatie",
      message:
        "Een geldig bestand wordt gelezen en pas na bevestiging toegepast op de bewerkversie. De website verandert nog niet.",
      tone: "warning"
    })}

    <section class="studio-section">
      <div class="studio-card">
        <div class="studio-card-head">
          <div>
            <h2>Gegevensbestand kiezen</h2>
            <p class="studio-muted">Gebruik een bibliotheekbestand van maximaal 1 MB.</p>
          </div>
        </div>
        <div class="studio-actions">
          ${renderButton({
            label: "Gegevensbestand kiezen",
            variant: "primary",
            attributes: { "data-library-import-button": true }
          })}
          ${renderFileInput({
            id: "library-import-file",
            accept: ".json",
            label: "library.json importeren",
            attributes: { "data-library-import-file": true }
          })}
        </div>
      </div>
    </section>

    ${renderImportSummary(sessionSnapshot.lastValidationReport)}
    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport bibliotheekimport"
    })}

    <p class="studio-muted">Geladen bestand: ${escapeHtml(sessionSnapshot.sourceFileName)}.</p>
  `;
}

export function setupLibraryImport({
  librarySession,
  supplierSession,
  brochureSession,
  articleSession,
  mediaSession,
  rerender = () => {}
}) {
  const importButton = document.querySelector("[data-library-import-button]");
  const importInput = document.querySelector("[data-library-import-file]");
  const restoreButton = document.querySelector("[data-library-restore]");

  importButton?.addEventListener("click", () => {
    if (importInput) {
      importInput.value = "";
      importInput.click();
    }
  });

  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    await handleImportFile({ file, librarySession, supplierSession, brochureSession, articleSession, mediaSession, rerender });
    importInput.value = "";
  });

  restoreButton?.addEventListener("click", async () => {
    if (librarySession.snapshot().dirty) {
      const confirmed = await confirmStudioAction({
        title: "Bewerkversie herstellen?",
        message:
          "De bewerkversie wijkt af van het geladen bestand. Als je doorgaat, worden deze wijzigingen verworpen.",
        confirmLabel: "Bewerkversie herstellen",
        cancelLabel: "Annuleren",
        tone: "warning"
      });
      if (!confirmed) return;
    }

    librarySession.restoreSource();
    rerender();
  });
}
