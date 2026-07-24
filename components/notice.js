import { classNames, escapeHtml } from "../shared/utils.js";

export function renderNotice({ title, message, tone = "info" }) {
  return `
    <aside class="${classNames("studio-notice", `is-${tone}`)}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </aside>
  `;
}

