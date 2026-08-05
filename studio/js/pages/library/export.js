import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderSessionBanner } from "../../../../components/session-banner.js";
import { renderValidationReport } from "../../../../components/validation-report.js";
import { LIBRARY_EXPORT_FILENAME } from "../../../../shared/library-normalizer.js";
import {
  createBusyGuard,
  downloadTextFile
} from "../../shared/import-export-file.js";

function createIssue(path, message) {
  return { path, message };
}

function createExportReport(path, message) {
  return {
    valid: false,
    errors: [createIssue(path, message)],
    warnings: [],
    action: "export",
    sourceFileName: LIBRARY_EXPORT_FILENAME
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

function setButtonBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
  button.setAttribute("aria-busy", busy ? "true" : "false");
  button.textContent = busy ? "Gegevens exporteren..." : "Gegevens exporteren";
}

function renderSessionStatus(snapshot) {
  if (snapshot.exportedCurrent) return "Gegevens geexporteerd, overdracht nog niet bevestigd";
  if (snapshot.hasUnexportedChanges) return "Wijzigingen nog niet geexporteerd";
  if (snapshot.dirty) return "Bewerkversie wijkt af van het geladen bestand";
  return "Gelijk aan het geladen bestand";
}

function renderExportNotice(sessionSnapshot) {
  if (!sessionSnapshot.exportedCurrent) return "";

  return renderNotice({
    title: "Export gedownload",
    message:
      "De gegevens zijn gedownload. Draag het beheerbestand handmatig over en gebruik daarna Website bijwerken.",
    tone: "success"
  });
}

function renderExportSummary(report) {
  if (report?.action !== "export") return "";

  return `
    <section class="studio-section" aria-label="Exportsamenvatting">
      <div class="studio-grid studio-grid-3">
        <article class="studio-card studio-metric-card">
          <h3>Items</h3>
          <p class="studio-metric-value">${Number(report.itemCount || 0)}</p>
          <p class="studio-muted">Aantal items in de bewerkversie.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Waarschuwingen</h3>
          <p class="studio-metric-value">${Number(report.warnings?.length || 0)}</p>
          <p class="studio-muted">Waarschuwingen blokkeren export niet.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Blokkades</h3>
          <p class="studio-metric-value">${Number(report.errors?.length || 0)}</p>
          <p class="studio-muted">Fouten blokkeren export.</p>
        </article>
      </div>
    </section>
  `;
}

export function renderLibraryExportPage({ sessionSnapshot }) {
  return `
    ${renderPageHeader({
      eyebrow: "Bibliotheekbeheer",
      title: "Bibliotheekgegevens exporteren",
      description: "Download gecontroleerde bibliotheekgegevens uit de bewerkversie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar bibliotheek", href: "#/bibliotheek", variant: "secondary" })}
      ${renderButton({ label: "Naar gegevens importeren", href: "#/bibliotheek/import", variant: "secondary" })}
    </div>

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "library.json",
      sourceDescription:
        "Exporteren downloadt alleen de bewerkversie als gegevensbestand.",
      exportMessage:
        "De gegevens zijn gedownload. Draag het beheerbestand handmatig over en gebruik daarna Website bijwerken.",
      statusText: renderSessionStatus,
      restoreLabel: "Bewerkversie herstellen",
      restoreAttributes: { "data-library-restore": true }
    })}

    ${renderExportNotice(sessionSnapshot)}

    ${renderNotice({
      title: "Handmatige overdracht",
      message:
        "Exporteren downloadt alleen een bestand. Studio publiceert niets automatisch.",
      tone: "warning"
    })}

    <section class="studio-section">
      <div class="studio-card">
        <div class="studio-card-head">
          <div>
            <h2>Gecontroleerde gegevens</h2>
            <p class="studio-muted">Alleen velden die bij het bibliotheekmodel horen worden meegenomen.</p>
          </div>
        </div>
        <div class="studio-actions">
          ${renderButton({
            label: "Gegevens exporteren",
            variant: "primary",
            attributes: { "data-library-export-button": true }
          })}
        </div>
      </div>
    </section>

    ${renderExportSummary(sessionSnapshot.lastValidationReport)}
    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport bibliotheekexport"
    })}
  `;
}

export function setupLibraryExport({ librarySession, rerender = () => {}, restoreDraft }) {
  const exportButton = document.querySelector("[data-library-export-button]");
  const restoreButton = document.querySelector("[data-library-restore]");
  const exportGuard = createBusyGuard();

  exportButton?.addEventListener("click", async () => {
    if (exportGuard.isBusy()) return;

    await exportGuard.run(async () => {
      setButtonBusy(exportButton, true);

      try {
        let exportResult;
        try {
          exportResult = librarySession.prepareExport();
        } catch {
          librarySession.setValidationReport(
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
            fileName: LIBRARY_EXPORT_FILENAME,
            content: exportResult.json,
            type: "application/json;charset=utf-8"
          });
        } catch {
          librarySession.setValidationReport(
            createExportReport(
              "export.download",
              "De download kon niet worden gestart. De bewerkversie is niet gewijzigd."
            )
          );
          rerenderAndFocusReport(rerender);
          return;
        }

        await librarySession.markExported(exportResult.report);
        rerenderAndFocusReport(rerender);
      } finally {
        setButtonBusy(exportButton, false);
      }
    });
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

    if (restoreDraft) {
      await restoreDraft();
    } else {
      librarySession.restoreSource();
    }
    rerender();
  });
}
