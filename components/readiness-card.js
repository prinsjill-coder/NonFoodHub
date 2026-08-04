import { renderStatusBadge } from "./status-badge.js";
import { escapeHtml } from "../shared/utils.js";

function normalizeReason(reason, index) {
  if (typeof reason === "string") {
    return {
      message: reason,
      priority: index + 1,
      priorityLabel: index === 0 ? "Eerst afronden" : "Controlepunt"
    };
  }

  return {
    message: reason?.message || "Governance-signaal vraagt aandacht.",
    priority: Number(reason?.priority || index + 1),
    priorityLabel: reason?.priorityLabel || (index === 0 ? "Eerst afronden" : "Controlepunt"),
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
          ? `<a class="studio-inline-link studio-readiness-link" href="${escapeHtml(normalized.governanceRoute)}">Bekijk in Governance</a>`
          : ""
      }
    </li>
  `;
}

function renderPublicationItem(item, index) {
  const normalized = normalizeReason(item, index);

  return `
    <li class="studio-readiness-reason">
      <div class="studio-readiness-reason-main">
        <span class="studio-readiness-priority">${escapeHtml(normalized.priorityLabel)}</span>
        <span>${escapeHtml(normalized.message)}</span>
      </div>
    </li>
  `;
}

function renderPublicationCheck(check) {
  return `<li>${escapeHtml(check?.message || check || "Onderdeel is ingevuld.")}</li>`;
}

function publicationDatasetLabel(dataset) {
  const value = String(dataset || "");
  if (value.includes("articles")) return "Kennisbank";
  if (value.includes("suppliers")) return "Leveranciers";
  if (value.includes("brochures")) return "Brochures";
  return "Website";
}

function publicationIntro(publication) {
  if (publication.status === "ready") {
    return "Dit staat op de publieke website via de gecontroleerde gegevens.";
  }
  if (publication.status === "review") {
    return "Dit is zichtbaar, maar onderstaande punten moeten nog worden gecontroleerd.";
  }
  if (publication.status === "not_public") {
    return "Dit staat nog niet op de publieke website. De punten hieronder tonen wat nog ontbreekt.";
  }
  return "Deze module heeft nog geen publieke websiteweergave; Studio toont alleen de beheercontrole.";
}

function renderPublication(publication) {
  if (!publication) return "";

  const reasons = Array.isArray(publication.reasons) ? publication.reasons : [];
  const checks = Array.isArray(publication.checks) ? publication.checks : [];
  const reasonHeading = publication.status === "not_applicable" ? "Context" : "Nog afronden";

  return `
    <section class="studio-publication-readiness">
      <div class="studio-card-head">
        <div>
          <h3>Publieke website</h3>
          ${
            publication.dataset
              ? `<p class="studio-muted">Publieke website: ${escapeHtml(publicationDatasetLabel(publication.dataset))}</p>`
              : `<p class="studio-muted">Geen websiteweergave aangesloten voor deze module.</p>`
          }
        </div>
        ${renderStatusBadge(publication.state || publication.status, publication.label)}
      </div>
      <p class="studio-muted">${escapeHtml(publicationIntro(publication))}</p>
      ${
        checks.length
          ? `<div class="studio-publication-checks">
              <h4>Al klaar</h4>
              <ul>${checks.map(renderPublicationCheck).join("")}</ul>
            </div>`
          : ""
      }
      ${
        reasons.length
          ? `<div>
              <h4>${escapeHtml(reasonHeading)}</h4>
              <ol class="studio-readiness-list">
                ${reasons.map(renderPublicationItem).join("")}
              </ol>
            </div>`
          : `<p class="studio-muted">Geen ontbrekende website-informatie gevonden.</p>`
      }
    </section>
  `;
}

export function renderReadinessCard(readiness) {
  const status = readiness?.status || "review";
  const label = readiness?.label || "Nog enkele punten afronden";
  const score = Number(readiness?.score || 0);
  const reasons = Array.isArray(readiness?.reasons) ? readiness.reasons : [];

  return `
    <article class="studio-card studio-readiness-card">
      <div class="studio-card-head">
        <h2>Klaar voor de website?</h2>
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
      ${renderPublication(readiness?.publication)}
    </article>
  `;
}
