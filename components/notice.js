import { classNames, escapeHtml } from "../shared/utils.js";

export function renderNotice({ title, message, tone = "info" }) {
  const isUrgent = tone === "error";
  return `
    <aside class="${classNames("studio-notice", `is-${tone}`)}" role="${isUrgent ? "alert" : "status"}" aria-live="${isUrgent ? "assertive" : "polite"}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </aside>
  `;
}
