import { escapeHtml } from "../shared/utils.js";

export function renderValidationSummary(errors, options = {}) {
  const entries = Object.entries(errors);
  const fieldIdForName = options.fieldIdForName || ((fieldName) => `studio-field-${fieldName}`);
  const items = entries
    .map(([fieldName, message]) => {
      const fieldId = fieldIdForName(fieldName);
      return `<li><a href="#${escapeHtml(fieldId)}" data-error-link="${escapeHtml(fieldName)}">${escapeHtml(message)}</a></li>`;
    })
    .join("");

  return `
    <section class="studio-validation-summary" tabindex="-1" role="alert" aria-live="assertive" aria-labelledby="supplier-validation-summary-title">
      <h2 id="supplier-validation-summary-title">Controleer het formulier</h2>
      <p>${entries.length === 1 ? "Er is 1 fout gevonden." : `Er zijn ${entries.length} fouten gevonden.`}</p>
      <ul>${items}</ul>
    </section>
  `;
}
