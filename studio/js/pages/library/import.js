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
      "Het lezen van het bestand is afgebroken. De actieve bibliotheekwerksessie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  if (error?.code === "read_failed") {
    return createImportReport(
      "import.read",
      "Het bestand kon niet worden gelezen. De actieve bibliotheekwerksessie is niet gewijzigd.",
      fileName || "onbekend bestand"
    );
  }

  return createImportReport(
    "import.json",
    "Ongeldige JSON. Controleer of het bestand volledige JSON bevat. De actieve bibliotheekwerksessie is niet gewijzigd.",
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
        "Geen bestand geselecteerd. Kies een .json-bestand. De actieve bibliotheekwerksessie is niet gewijzigd.",
        "geen bestand"
      )
    };
  }

  if (fileValidation.code === "invalid_extension") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Kies een bestand met de extensie .json. De actieve bibliotheekwerksessie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  if (fileValidation.code === "file_too_large") {
    return {
      ok: false,
      report: createImportReport(
        "import.file",
        "Het bestand is groter dan 1 MB. Kies een kleiner library.json-bestand. De actieve bibliotheekwerksessie is niet gewijzigd.",
        file.name || "onbekend bestand"
      )
    };
  }

  return { ok: true };
}

function renderSessionStatus(snapshot) {
  if (snapshot.exportedCurrent) return "Geëxporteerd, nog niet bevestigd als geplaatst";
  if (snapshot.hasUnexportedChanges) return "Niet-geëxporteerde bibliotheekwijzigingen";
  if (snapshot.dirty) return "Niet-opgeslagen bibliotheekwijzigingen";
  return "Gelijk aan geladen bron";
}

function renderImportSummary(report) {
  if (report?.action !== "import") return "";

  return `
    <section class="studio-section" aria-label="Importsamenvatting">
      <div class="studio-grid studio-grid-4">
        <article class="studio-card studio-metric-card">
          <h3>Items</h3>
          <p class="studio-metric-value">${Number(report.itemCount || 0)}</p>
          <p class="studio-muted">Aantal items in het geselecteerde JSON-bestand.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Nieuw</h3>
          <p class="studio-metric-value">${Number(report.newItems || 0)}</p>
          <p class="studio-muted">Nog niet aanwezig in de huidige werksessie.</p>
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
    ? " De actieve bibliotheekwerksessie wijkt af van de geladen bron en wordt vervangen als je doorgaat."
    : "";

  return confirmStudioAction({
    title: "Bibliotheekbestand importeren?",
    message: `${report.sourceFileName} bevat ${report.itemCount} bibliotheekitems. Importeren vervangt alleen de actieve browserwerksessie, schrijft niets naar de repository en publiceert niets.${dirtyMessage}`,
    confirmLabel: "Importeren",
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
      title: "Bibliotheek importeren",
      description: "Valideer een library.json-bestand en laad het uitsluitend in de actieve browserwerksessie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar bibliotheek", href: "#/bibliotheek", variant: "secondary" })}
      ${renderButton({ label: "Naar export", href: "#/bibliotheek/export", variant: "secondary" })}
    </div>

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "library.json",
      sourceDescription:
        "Importeren vervangt alleen de actieve browserwerksessie. Er wordt niets naar data/library.json geschreven.",
      exportMessage:
        "Dit bestand is alleen gedownload. Vervang handmatig /data/library.json en commit en push daarna zelf via GitHub Desktop.",
      statusText: renderSessionStatus,
      restoreLabel: "Bibliotheeksessie herstellen",
      restoreAttributes: { "data-library-restore": true }
    })}

    ${renderNotice({
      title: "Import is geen publicatie",
      message:
        "Een geldig bestand wordt lokaal in de browser gelezen en pas na bevestiging toegepast op workingData. Studio schrijft niet naar de repository.",
      tone: "warning"
    })}

    <section class="studio-section">
      <div class="studio-card">
        <div class="studio-card-head">
          <div>
            <h2>JSON-bestand kiezen</h2>
            <p class="studio-muted">Gebruik een library.json-bestand van maximaal 1 MB.</p>
          </div>
        </div>
        <div class="studio-actions">
          ${renderButton({
            label: "Importbestand kiezen",
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

    <p class="studio-muted">Actieve bron: ${escapeHtml(sessionSnapshot.sourceFileName)}.</p>
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
        title: "Bibliotheeksessie herstellen?",
        message:
          "De actieve bibliotheekwerksessie wijkt af van de geladen bron. Als je doorgaat, worden deze werksessiewijzigingen verworpen.",
        confirmLabel: "Sessie herstellen",
        cancelLabel: "Annuleren",
        tone: "warning"
      });
      if (!confirmed) return;
    }

    librarySession.restoreSource();
    rerender();
  });
}
