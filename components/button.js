import { classNames, escapeHtml } from "../shared/utils.js";

export function renderButton({ label, href = "", variant = "primary", disabled = false, ariaLabel = "" }) {
  const classes = classNames("studio-button", `studio-button-${variant}`, disabled && "is-disabled");
  const safeLabel = escapeHtml(label);
  const safeAria = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : "";

  if (href && !disabled) {
    return `<a class="${classes}" href="${escapeHtml(href)}"${safeAria}>${safeLabel}</a>`;
  }

  return `<button class="${classes}" type="button" disabled${safeAria}>${safeLabel}</button>`;
}
