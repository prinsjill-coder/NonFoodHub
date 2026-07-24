import { STATUS_LABELS } from "../shared/config.js";
import { classNames, escapeHtml } from "../shared/utils.js";

export function renderStatusBadge(status, label = STATUS_LABELS[status] || status) {
  return `<span class="${classNames("studio-badge", status ? `is-${status}` : "")}">${escapeHtml(label)}</span>`;
}
