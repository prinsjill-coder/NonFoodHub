import { renderStatusBadge } from "./status-badge.js";
import { escapeHtml } from "../shared/utils.js";

function normalizeReason(reason, index) {
  if (typeof reason === "string") {
    return {
      message: reason,
      priority: index + 1,
      priorityLabel: index === 0 ? "Eerst controleren" : "Controle gewenst"
    };
  }

  return {
    message: reason?.message || "Governance-signaal vraagt aandacht.",
    priority: Number(reason?.priority || index + 1),
    priorityLabel: reason?.priorityLabel || (index === 0 ? "Eerst controleren" : "Controle gewenst"),
    governanceRoute: reason?.governanceRoute || "",
    targetRoute: reason?.targetRoute || ""
  };
}

function renderReason(reason, index) {
  const normalized = normalizeReason(reason, index);

  return `
    <li class="studio-readiness-reason">
      <div class="studio-readiness-reason-main">
        <span class="studio-readiness-priority">${escapeHtml(normalized.priorityLabel)}</span>
        <span>${escapeHtml(normalized.message)}</span>
      </div>
      ${
        normalized.governanceRoute
          ? `<a class="studio-inline-link studio-readiness-link" href="${escapeHtml(normalized.governanceRoute)}">Bekijk in governance</a>`
          : ""
      }
    </li>
  `;
}

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
          ? `<ol class="studio-readiness-list">
              ${reasons.map(renderReason).join("")}
            </ol>`
          : `<p class="studio-muted">Geen aandachtspunten gevonden in bestaande governance-issues.</p>`
      }
    </article>
  `;
}
