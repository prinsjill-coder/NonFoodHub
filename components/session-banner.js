import { renderButton } from "./button.js";
import { renderStatusBadge } from "./status-badge.js";
import { escapeHtml } from "../shared/utils.js";

function statusText(snapshot) {
  if (snapshot.exportedCurrent) {
    return "Gegevens geexporteerd, website nog niet bijgewerkt";
  }

  if (snapshot.hasUnexportedChanges) {
    return "Wijzigingen nog niet geexporteerd";
  }

  if (snapshot.dirty) {
    return "Bewerkversie wijkt af van het geladen bestand";
  }

  return "Gelijk aan het geladen bestand";
}

export function renderSessionBanner(snapshot, options = {}) {
  const tone = snapshot.hasUnexportedChanges ? "warning" : snapshot.exportedCurrent ? "success" : "info";
  const badge = snapshot.hasUnexportedChanges ? "review" : snapshot.exportedCurrent ? "success" : "foundation";
  const sourceDescription =
    options.sourceDescription ||
    `Wijzigingen blijven alleen in de bewerkversie totdat je ${options.fileName || "het bestand"} exporteert.`;
  const exportMessage =
    options.exportMessage ||
    "Dit bestand is gedownload. Vervang het beheerbestand handmatig en voer daarna npm run generate:public uit voor Website bijwerken.";

  return `
    <section class="studio-session-banner is-${tone}" aria-label="Status van de bewerkversie" role="status" aria-live="polite">
      <div>
        <p class="studio-kicker">Bewerkversie</p>
        <h2>${escapeHtml(options.statusText ? options.statusText(snapshot) : statusText(snapshot))}</h2>
        <p>
          Geladen bestand: ${escapeHtml(snapshot.sourceFileName)}.
          ${escapeHtml(sourceDescription)}
        </p>
        ${
          snapshot.exportedCurrent
            ? `<p class="studio-meta">${escapeHtml(exportMessage)}</p>`
            : ""
        }
        ${
          snapshot.lastExport
            ? `<p class="studio-meta">Laatste export: ${escapeHtml(snapshot.lastExport.fileName)} om ${escapeHtml(snapshot.lastExport.at)}.</p>`
            : ""
        }
      </div>
      <div class="studio-session-actions">
        ${renderStatusBadge(badge)}
        ${renderButton({
          label: options.restoreLabel || "Bewerkversie herstellen",
          variant: "outline",
          attributes: options.restoreAttributes || { "data-supplier-restore": true }
        })}
      </div>
    </section>
  `;
}
