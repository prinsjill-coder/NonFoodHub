import { escapeHtml } from "../shared/utils.js";

function renderIssues(title, issues, level) {
  if (!issues.length) return "";
  const items = issues
    .map((issue) => `
      <li>
        <code>${escapeHtml(issue.path)}</code>
        <span>${escapeHtml(issue.message)}</span>
      </li>
    `)
    .join("");

  return `
    <section class="studio-report-section is-${level}">
      <h3>${escapeHtml(title)}</h3>
      <ul>${items}</ul>
    </section>
  `;
}

export function renderValidationReport(report, options = {}) {
  if (!report) return "";
  const title = options.title || "Validatierapport";
  const hasErrors = Boolean(report.errors?.length);
  const validMessage = report.valid
    ? "Geen blokkerende fouten gevonden."
    : "Los de blokkerende fouten op voordat je importeert of exporteert.";

  return `
    <article class="studio-validation-report" data-validation-report role="${hasErrors ? "alert" : "status"}" aria-live="${hasErrors ? "assertive" : "polite"}">
      <div class="studio-card-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p class="studio-muted">${escapeHtml(validMessage)}</p>
          ${
            report.sourceFileName
              ? `<p class="studio-meta">Bestand: ${escapeHtml(report.sourceFileName)}</p>`
              : ""
          }
        </div>
      </div>
      ${renderIssues("Fouten", report.errors || [], "error")}
      ${renderIssues("Waarschuwingen", report.warnings || [], "warning")}
    </article>
  `;
}
