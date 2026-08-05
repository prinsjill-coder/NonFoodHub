import {
  ARTICLES_EXPORT_FILENAME
} from "../../../../shared/article-normalizer.js";
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
    sourceFileName: ARTICLES_EXPORT_FILENAME
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

export function setupArticleExport({ articleSession, rerender = () => {} }) {
  const exportButton = document.querySelector("[data-article-export-button]");
  const exportGuard = createBusyGuard();

  exportButton?.addEventListener("click", async () => {
    if (exportGuard.isBusy()) return;

    await exportGuard.run(async () => {
      setButtonBusy(exportButton, true);

      try {
        let exportResult;
        try {
          exportResult = articleSession.prepareExport();
        } catch {
          articleSession.setValidationReport(
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
            fileName: ARTICLES_EXPORT_FILENAME,
            content: exportResult.json,
            type: "application/json;charset=utf-8"
          });
        } catch {
          articleSession.setValidationReport(
            createExportReport(
              "export.download",
              "De download kon niet worden gestart. De bewerkversie is niet gewijzigd."
            )
          );
          rerenderAndFocusReport(rerender);
          return;
        }

        await articleSession.markExported(exportResult.report);
        rerenderAndFocusReport(rerender);
      } finally {
        setButtonBusy(exportButton, false);
      }
    });
  });
}
