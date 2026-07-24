import { escapeHtml } from "../shared/utils.js";

export function renderEmptyState({ title, message, label = "Placeholder" }) {
  return `
    <section class="studio-empty-state" aria-label="${escapeHtml(label)}">
      <p class="studio-kicker">${escapeHtml(label)}</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}
