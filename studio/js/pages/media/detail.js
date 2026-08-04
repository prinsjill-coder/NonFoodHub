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
      description: "Bekijk gegevens van een geregistreerd mediabestand binnen de bewerkversie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar media", href: "#/media", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/media/${asset.id}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Geen uploadfunctie",
      message:
        "Deze detailweergave registreert alleen gegevens en een bestand. Studio uploadt of verplaatst geen bestanden.",
      tone: "info"
    })}

    <section class="studio-section">
      ${renderReadinessCard(readiness)}
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Gegevens</h2>
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
        <h2>Bestandscontrole</h2>
      </div>
      <article class="studio-card">
        <p class="studio-muted">Ingevuld bestand</p>
        <p><code>${escapeHtml(asset.file)}</code></p>
        <p class="studio-meta">Bestandscontrole gebeurt via checks en handmatige QA, niet via upload in Studio.</p>
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
            emptyText: "Nog geen leveranciers gebruiken dit bestand.",
            hrefForItem: (supplier) => `#/leveranciers/${supplier.slug}`,
            labelForItem: (supplier) => supplier.name,
            statusForItem: (supplier) => supplier.status,
            statusLabelForItem: (supplier) => getSupplierStatusLabel(supplier.status)
          })}
        </article>
        <article class="studio-card">
          <h3>Brochures</h3>
          ${renderUsageList(usage.brochures, {
            emptyText: "Nog geen brochures gebruiken dit bestand.",
            hrefForItem: (brochure) => `#/brochures/${brochure.slug}`,
            labelForItem: (brochure) => brochure.title,
            statusForItem: (brochure) => brochure.status,
            statusLabelForItem: (brochure) => getBrochureStatusLabel(brochure.status)
          })}
        </article>
        <article class="studio-card">
          <h3>Artikelen</h3>
          ${renderUsageList(usage.articles, {
            emptyText: "Nog geen artikelen gebruiken dit bestand.",
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
