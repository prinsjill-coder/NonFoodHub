import { escapeHtml } from "../shared/utils.js";

export function renderEmptyState({ title, message, label = "Placeholder", actions = "" }) {
  return `
    <section class="studio-empty-state" aria-label="${escapeHtml(label)}">
      <p class="studio-kicker">${escapeHtml(label)}</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      ${actions ? `<div class="studio-actions">${actions}</div>` : ""}
    </section>
  `;
}
