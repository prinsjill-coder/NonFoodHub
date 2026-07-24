import { escapeHtml } from "../shared/utils.js";

function renderAttributes(attributes = {}) {
  return Object.entries(attributes)
    .map(([name, value]) => {
      if (value === false || value === null || value === undefined) return "";
      if (value === true) return ` ${name}`;
      return ` ${name}="${escapeHtml(value)}"`;
    })
    .join("");
}

export function renderFileInput({ id, accept = ".json", label = "Bestand kiezen", attributes = {} }) {
  return `
    <label class="studio-file-input" for="${escapeHtml(id)}">
      <span>${escapeHtml(label)}</span>
      <input id="${escapeHtml(id)}" type="file" accept="${escapeHtml(accept)}"${renderAttributes(attributes)}>
    </label>
  `;
}
