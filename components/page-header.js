import { escapeHtml } from "../shared/utils.js";

export function renderPageHeader({ eyebrow, title, description }) {
  return `
    <header class="studio-page-header">
      <p class="studio-kicker">${escapeHtml(eyebrow)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </header>
  `;
}
