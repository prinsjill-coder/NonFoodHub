import { escapeHtml } from "../shared/utils.js";

export function renderDetailList(items) {
  const rows = items
    .map((item) => `
      <div class="studio-detail-row">
        <dt>${escapeHtml(item.label)}</dt>
        <dd>${item.html ? item.value : escapeHtml(item.value || "Niet ingevuld")}</dd>
      </div>
    `)
    .join("");

  return `<dl class="studio-detail-list">${rows}</dl>`;
}

