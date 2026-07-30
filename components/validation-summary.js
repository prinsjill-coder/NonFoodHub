import { escapeHtml } from "../shared/utils.js";

export function renderValidationSummary(errors, options = {}) {
  const entries = Object.entries(errors);
  const fieldIdForName = options.fieldIdForName || ((fieldName) => `studio-field-${fieldName}`);
  const headingId = options.headingId || "studio-validation-summary-title";
  const title = options.title || "Controleer het formulier";
  const items = entries
    .map(([fieldName, message]) => {
      const fieldId = fieldIdForName(fieldName);
      return `<li><a href="#${escapeHtml(fieldId)}" data-error-link="${escapeHtml(fieldName)}">${escapeHtml(message)}</a></li>`;
    })
    .join("");

  return `
    <section class="studio-validation-summary" tabindex="-1" role="alert" aria-live="assertive" aria-labelledby="${escapeHtml(headingId)}">
      <h2 id="${escapeHtml(headingId)}">${escapeHtml(title)}</h2>
      <p>${entries.length === 1 ? "Er is 1 fout gevonden." : `Er zijn ${entries.length} fouten gevonden.`}</p>
      <ul>${items}</ul>
    </section>
  `;
}
