import { escapeHtml } from "../shared/utils.js";

export function renderValidationSummary(errors) {
  const items = Object.values(errors)
    .map((message) => `<li>${escapeHtml(message)}</li>`)
    .join("");

  return `
    <section class="studio-validation-summary" tabindex="-1">
      <h2>Controleer het formulier</h2>
      <ul>${items}</ul>
    </section>
  `;
}

