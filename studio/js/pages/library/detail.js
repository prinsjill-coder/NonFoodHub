import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import { getBrochureStatusLabel } from "../../../../shared/brochure-model.js";
import {
  findLibraryArticles,
  findLibraryBrochures,
  findLibrarySuppliers,
  findMediaAssetByPath
} from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import { getLibraryStatusLabel, getLibraryTypeLabel } from "../../../../shared/library-model.js";
import { getMediaStatusLabel } from "../../../../shared/media-model.js";
import { getSupplierStatusLabel } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

function renderRelationList(items, { emptyText, hrefForItem, labelForItem, statusForItem, statusLabelForItem }) {
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

function renderPathReference({ label, path, mediaData }) {
  const asset = findMediaAssetByPath(mediaData, path);

  if (!path) {
    return `
      <article class="studio-card">
        <h2>${escapeHtml(label)}</h2>
        <p class="studio-muted">Geen pad gekoppeld.</p>
      </article>
    `;
  }

  return `
    <article class="studio-card">
      <div class="studio-card-head">
        <h2>${escapeHtml(label)}</h2>
        ${asset ? renderStatusBadge(asset.status, getMediaStatusLabel(asset.status)) : renderStatusBadge("review")}
      </div>
      <p><code>${escapeHtml(path)}</code></p>
      ${
        asset
          ? `<p class="studio-meta">Geregistreerd in Media als <a class="studio-inline-link" href="#/media/${escapeHtml(asset.id)}">${escapeHtml(asset.title)}</a>.</p>`
          : `<p class="studio-muted">Dit pad staat nog niet geregistreerd in media.json.</p>`
      }
    </article>
  `;
}

export function renderLibraryDetail({ libraryData, supplierData, brochureData, articleData, mediaData, item }) {
  const relatedSuppliers = findLibrarySuppliers(item, supplierData);
  const relatedBrochures = findLibraryBrochures(item, brochureData);
  const relatedArticles = findLibraryArticles(item, articleData);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData,
    library: libraryData
  });
  const readiness = findReadinessByRoute(readinessReport, "library", `#/bibliotheek/${item.slug}`);

  return `
    ${renderPageHeader({
      eyebrow: "Bibliotheekbeheer",
      title: item.title,
      description: "Bekijk metadata, bestandspaden en relaties van een bibliotheekitem binnen de actieve Studio-werksessie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar bibliotheek", href: "#/bibliotheek", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/bibliotheek/${item.slug}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Register zonder downloadservice",
      message:
        "Deze detailweergave registreert alleen metadata en relatieve projectpaden. Studio uploadt geen bestanden en biedt nog geen publieke downloadroute.",
      tone: "info"
    })}

    <section class="studio-section">
      ${renderReadinessCard(readiness)}
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Metadata</h2>
        ${renderStatusBadge(item.status, getLibraryStatusLabel(item.status))}
      </div>
      ${renderDetailList([
        { label: "ID", value: item.id },
        { label: "Slug", value: item.slug },
        { label: "Type", value: getLibraryTypeLabel(item.type, libraryData) },
        { label: "Categorie", value: item.category },
        { label: "Samenvatting", value: item.summary },
        { label: "Tags", value: (item.tags || []).join(", ") || "Geen tags" },
        { label: "Bijgewerkt", value: item.updatedAt },
        { label: "Sortering", value: String(item.sortOrder ?? 0) }
      ])}
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        ${renderPathReference({ label: "Bestandspad", path: item.filePath, mediaData })}
        ${renderPathReference({ label: "Thumbnailpad", path: item.thumbnailPath, mediaData })}
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Relaties</h2>
      </div>
      <div class="studio-grid studio-grid-3">
        <article class="studio-card">
          <h3>Leveranciers</h3>
          ${renderRelationList(relatedSuppliers, {
            emptyText: "Geen leveranciers gekoppeld.",
            hrefForItem: (supplier) => `#/leveranciers/${supplier.slug}`,
            labelForItem: (supplier) => supplier.name,
            statusForItem: (supplier) => supplier.status,
            statusLabelForItem: (supplier) => getSupplierStatusLabel(supplier.status)
          })}
        </article>
        <article class="studio-card">
          <h3>Brochures</h3>
          ${renderRelationList(relatedBrochures, {
            emptyText: "Geen brochures gekoppeld.",
            hrefForItem: (brochure) => `#/brochures/${brochure.slug}`,
            labelForItem: (brochure) => brochure.title,
            statusForItem: (brochure) => brochure.status,
            statusLabelForItem: (brochure) => getBrochureStatusLabel(brochure.status)
          })}
        </article>
        <article class="studio-card">
          <h3>Kennisbankartikelen</h3>
          ${renderRelationList(relatedArticles, {
            emptyText: "Geen kennisbankartikelen gekoppeld.",
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
