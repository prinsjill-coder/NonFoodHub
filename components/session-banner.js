import { renderButton } from "./button.js";
import { renderStatusBadge } from "./status-badge.js";
import { escapeHtml } from "../shared/utils.js";

function statusText(snapshot) {
  if (snapshot.exportedCurrent) {
    return "Geëxporteerd, nog niet bevestigd als geplaatst";
  }

  if (snapshot.hasUnexportedChanges) {
    return "Niet-geëxporteerde werksessiewijzigingen";
  }

  if (snapshot.dirty) {
    return "Werksessie wijkt af van de bron";
  }

  return "Gelijk aan geladen bron";
}

export function renderSessionBanner(snapshot) {
  const tone = snapshot.hasUnexportedChanges ? "warning" : snapshot.exportedCurrent ? "success" : "info";
  const badge = snapshot.hasUnexportedChanges ? "review" : snapshot.exportedCurrent ? "success" : "foundation";

  return `
    <section class="studio-session-banner is-${tone}" aria-label="Werksessiestatus" role="status" aria-live="polite">
      <div>
        <p class="studio-kicker">Werksessie</p>
        <h2>${escapeHtml(statusText(snapshot))}</h2>
        <p>
          Bron: ${escapeHtml(snapshot.sourceFileName)}.
          Wijzigingen bestaan alleen in browsergeheugen totdat je suppliers.json exporteert.
        </p>
        ${
          snapshot.exportedCurrent
            ? `<p class="studio-meta">Dit bestand is alleen gedownload. Vervang handmatig /data/suppliers.json en commit en push daarna zelf via GitHub Desktop.</p>`
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
          label: "Sessie herstellen",
          variant: "outline",
          attributes: { "data-supplier-restore": true }
        })}
      </div>
    </section>
  `;
}
