import { escapeHtml, formatNullable } from "../shared/utils.js";
import { renderStatusBadge } from "./status-badge.js";

export function renderMetricCard(metric) {
  return `
    <article class="studio-card studio-metric-card">
      <div class="studio-card-head">
        <h3>${escapeHtml(metric.label)}</h3>
        ${renderStatusBadge(metric.state)}
      </div>
      <p class="studio-metric-value">${escapeHtml(formatNullable(metric.value))}</p>
      <p class="studio-muted">${escapeHtml(metric.note)}</p>
    </article>
  `;
}

export function renderPanelCard(panel) {
  return `
    <section class="studio-card">
      <div class="studio-card-head">
        <h3>${escapeHtml(panel.title)}</h3>
        ${renderStatusBadge(panel.state)}
      </div>
      <p class="studio-muted">${escapeHtml(panel.message)}</p>
    </section>
  `;
}
