import { renderStatusBadge } from "./status-badge.js";
import { escapeHtml } from "../shared/utils.js";

export function renderReadinessCard(readiness) {
  const status = readiness?.status || "review";
  const label = readiness?.label || "Review nodig";
  const score = Number(readiness?.score || 0);
  const reasons = Array.isArray(readiness?.reasons) ? readiness.reasons : [];

  return `
    <article class="studio-card studio-readiness-card">
      <div class="studio-card-head">
        <h2>Content readiness</h2>
        ${renderStatusBadge(status, label)}
      </div>
      <p class="studio-readiness-score">Score ${score}/100</p>
      ${
        reasons.length
          ? `<ul class="studio-readiness-list">
              ${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
            </ul>`
          : `<p class="studio-muted">Geen aandachtspunten gevonden in bestaande governance-issues.</p>`
      }
    </article>
  `;
}
