import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import {
  getMediaRightsStatusLabel,
  getMediaTypeLabel,
  getMediaUsageTypeLabel
} from "../../../../shared/media-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

export function renderMediaDetail({ mediaData, asset }) {
  return `
    ${renderPageHeader({
      eyebrow: "Mediaregister",
      title: asset.title,
      description: "Bekijk metadata van een geregistreerd media-asset binnen de actieve Studio-werksessie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar media", href: "#/media", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/media/${asset.id}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Registry zonder upload",
      message:
        "Deze detailweergave registreert alleen metadata en een relatief projectpad. Studio uploadt of verplaatst geen bestanden.",
      tone: "info"
    })}

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Metadata</h2>
        ${renderStatusBadge(asset.status)}
      </div>
      ${renderDetailList([
        { label: "ID", value: asset.id },
        { label: "Bestand", value: asset.file },
        { label: "Type", value: getMediaTypeLabel(asset.type, mediaData) },
        { label: "Gebruik", value: getMediaUsageTypeLabel(asset.usageType, mediaData) },
        { label: "Rechtenstatus", value: getMediaRightsStatusLabel(asset.rightsStatus, mediaData) },
        { label: "Alt-tekst", value: asset.alt },
        { label: "Caption", value: asset.caption },
        { label: "Afmetingen", value: asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Niet ingevuld" },
        { label: "Bestandsgrootte", value: asset.fileSize },
        { label: "Sortering", value: String(asset.sortOrder ?? 0) }
      ])}
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Padcontrole</h2>
      </div>
      <article class="studio-card">
        <p class="studio-muted">Geregistreerd relatief pad</p>
        <p><code>${escapeHtml(asset.file)}</code></p>
        <p class="studio-meta">Fysieke bestandscontrole gebeurt in lokale scripts en handmatige QA, niet via browser-upload.</p>
      </article>
    </section>
  `;
}
