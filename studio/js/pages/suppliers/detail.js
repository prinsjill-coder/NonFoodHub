import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import { getBrochureStatusLabel } from "../../../../shared/brochure-model.js";
import { findSupplierArticles, findSupplierBrochures } from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import { getSupplierStatusLabel, getSupplierTypeLabel } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

function mediaPath(path) {
  return path ? `../${path}` : "";
}

function renderMediaPreview(label, path, alt) {
  if (!path) {
    return `
      <article class="studio-card">
        <h3>${escapeHtml(label)}</h3>
        <p class="studio-muted">Geen referentie ingevuld.</p>
      </article>
    `;
  }

  return `
    <article class="studio-card studio-media-reference">
      <h3>${escapeHtml(label)}</h3>
      <img src="${escapeHtml(mediaPath(path))}" alt="${escapeHtml(alt)}" loading="lazy">
      <p class="studio-meta">${escapeHtml(path)}</p>
    </article>
  `;
}

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

export function renderSupplierDetail({ supplierData, brochureData = {}, articleData = {}, supplier }) {
  const relatedBrochures = findSupplierBrochures(supplier, brochureData);
  const relatedArticles = findSupplierArticles(supplier, articleData);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    articles: articleData
  });
  const readiness = findReadinessByRoute(readinessReport, "suppliers", `#/leveranciers/${supplier.slug}`);

  return `
    ${renderPageHeader({
      eyebrow: "Leverancier bekijken",
      title: supplier.name,
      description: supplier.summary || "Geen samenvatting ingevuld."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar overzicht", href: "#/leveranciers", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/leveranciers/${supplier.slug}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Alleen Studio-werksessie",
      message:
        "Deze detailweergave leest de actieve browserdata. Dit schrijft niet naar /data/suppliers.json en wijzigt de publieke website niet.",
      tone: "info"
    })}

    <section class="studio-section">
      ${renderReadinessCard(readiness)}
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        <article class="studio-card">
          <div class="studio-card-head">
            <h2>Basisgegevens</h2>
            ${renderStatusBadge(supplier.status, getSupplierStatusLabel(supplier.status))}
          </div>
          ${renderDetailList([
            { label: "Naam", value: supplier.name },
            { label: "Slug", value: supplier.slug },
            { label: "Type", value: getSupplierTypeLabel(supplier.type) },
            { label: "Categorieen", value: (supplier.categories || []).join(", ") },
            { label: "Uitgelicht", value: supplier.featured ? "Ja" : "Nee" },
            { label: "Sortering", value: String(supplier.sortOrder ?? 0) }
          ])}
        </article>
        <article class="studio-card">
          <h2>Omschrijving</h2>
          <p>${escapeHtml(supplier.description || "Geen omschrijving ingevuld.")}</p>
        </article>
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        ${renderMediaPreview("Logo", supplier.logo, `${supplier.name} logo`)}
        ${renderMediaPreview("Afbeelding", supplier.image, `${supplier.name} afbeelding`)}
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        <article class="studio-card">
          <h2>Brochures</h2>
          ${renderRelationList(relatedBrochures, {
            emptyText: "Geen brochures gekoppeld.",
            hrefForItem: (brochure) => `#/brochures/${brochure.slug}`,
            labelForItem: (brochure) => brochure.title,
            statusForItem: (brochure) => brochure.status,
            statusLabelForItem: (brochure) => getBrochureStatusLabel(brochure.status)
          })}
        </article>
        <article class="studio-card">
          <h2>Kennisbank</h2>
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
