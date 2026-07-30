import { escapeHtml, renderAttributes } from "../shared/utils.js";

export function renderFileInput({ id, accept = ".json", label = "Bestand kiezen", attributes = {} }) {
  return `
    <label class="studio-file-input" for="${escapeHtml(id)}">
      <span>${escapeHtml(label)}</span>
      <input id="${escapeHtml(id)}" type="file" accept="${escapeHtml(accept)}"${renderAttributes(attributes)}>
    </label>
  `;
}
