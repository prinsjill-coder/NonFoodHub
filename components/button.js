import { classNames, escapeHtml } from "../shared/utils.js";

function renderAttributes(attributes = {}) {
  return Object.entries(attributes)
    .map(([name, value]) => {
      if (value === false || value === null || value === undefined) return "";
      if (value === true) return ` ${name}`;
      return ` ${name}="${escapeHtml(value)}"`;
    })
    .join("");
}

export function renderButton({
  label,
  href = "",
  variant = "primary",
  disabled = false,
  ariaLabel = "",
  type = "button",
  attributes = {}
}) {
  const classes = classNames("studio-button", `studio-button-${variant}`, disabled && "is-disabled");
  const safeLabel = escapeHtml(label);
  const safeAria = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : "";
  const safeAttributes = renderAttributes(attributes);

  if (href && !disabled) {
    return `<a class="${classes}" href="${escapeHtml(href)}"${safeAria}${safeAttributes}>${safeLabel}</a>`;
  }

  return `<button class="${classes}" type="${escapeHtml(type)}" ${disabled ? "disabled" : ""}${safeAria}${safeAttributes}>${safeLabel}</button>`;
}
