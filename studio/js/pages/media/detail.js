import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import { getBrochureStatusLabel } from "../../../../shared/brochure-model.js";
import { findMediaUsage } from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import {
  getMediaRightsStatusLabel,
  getMediaTypeLabel,
  getMediaUsageTypeLabel
} from "../../../../shared/media-model.js";
import { getSupplierStatusLabel } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

function renderUsageList(items, { emptyText, hrefForItem, labelForItem, statusForItem, statusLabelForItem }) {
  if (!items.length) {
    return `<p class="studio-muted">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="studio-relation-list">
      ${items
        .map((item) => `
          <li>
            <a href="${escapeHtml(hrefForItem(item))}">${escapeHtml(labelForItem(item))}</a>
            ${renderStatusBadge(statusForItem(item), statusLabelForItem(item))}
          </li>
        `)
        .join("")}
    </ul>
  `;
}

export function renderMediaDetail({ mediaData, supplierData = {}, brochureData = {}, articleData = {}, asset }) {
  const usage = findMediaUsage(asset, supplierData, brochureData, articleData);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData
  });
  const readiness = findReadinessByRoute(readinessReport, "media", `#/media/${asset.id}`);

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
      ${renderReadinessCard(readiness)}
    </section>

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

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Gebruikt door</h2>
      </div>
      <div class="studio-grid studio-grid-3">
        <article class="studio-card">
          <h3>Leveranciers</h3>
          ${renderUsageList(usage.suppliers, {
            emptyText: "Geen leveranciers gebruiken dit pad.",
            hrefForItem: (supplier) => `#/leveranciers/${supplier.slug}`,
            labelForItem: (supplier) => supplier.name,
            statusForItem: (supplier) => supplier.status,
            statusLabelForItem: (supplier) => getSupplierStatusLabel(supplier.status)
          })}
        </article>
        <article class="studio-card">
          <h3>Brochures</h3>
          ${renderUsageList(usage.brochures, {
            emptyText: "Geen brochures gebruiken dit pad.",
            hrefForItem: (brochure) => `#/brochures/${brochure.slug}`,
            labelForItem: (brochure) => brochure.title,
            statusForItem: (brochure) => brochure.status,
            statusLabelForItem: (brochure) => getBrochureStatusLabel(brochure.status)
          })}
        </article>
        <article class="studio-card">
          <h3>Artikelen</h3>
          ${renderUsageList(usage.articles, {
            emptyText: "Geen artikelen gebruiken dit pad.",
            hrefForItem: (article) => `#/kennisbank/${article.slug}`,
            labelForItem: (article) => article.title,
            statusForItem: (article) => article.status,
            statusLabelForItem: (article) => getArticleStatusLabel(article.status)
          })}
        </article>
      </div>
    </section>
  `;
}
