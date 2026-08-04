import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import { getBrochureStatusLabel } from "../../../../shared/brochure-model.js";
import {
  findArticleBrochures,
  findArticleSuppliers,
  findMediaAssetByPath
} from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import { getMediaRightsStatusLabel, getMediaUsageTypeLabel } from "../../../../shared/media-model.js";
import { getSupplierStatusLabel } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

function bodyHtml(body) {
  return escapeHtml(body)
    .split("\n")
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
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

function mediaDetailHref(asset) {
  return `#/media/${escapeHtml(asset.id)}`;
}

function renderHeroImageValue(article, asset) {
  if (!asset) {
    return article.heroImage;
  }

  return `<a class="studio-inline-link" href="${mediaDetailHref(asset)}"><code>${escapeHtml(article.heroImage)}</code></a>`;
}

function renderHeroMedia(article, mediaData, asset) {
  if (!article.heroImage) {
    return `
      <article class="studio-card">
        <h2>Headerafbeelding</h2>
        <p class="studio-muted">Nog geen headerafbeelding gekoppeld.</p>
        <p class="studio-meta">Voorbeeld: assets/images/blog-terrace.png</p>
      </article>
    `;
  }

  if (!asset) {
    return `
      <article class="studio-card">
        <h2>Headerafbeelding</h2>
        <p><code>${escapeHtml(article.heroImage)}</code></p>
        <p class="studio-muted">Dit bestand staat nog niet geregistreerd in Media.</p>
      </article>
    `;
  }

  return `
    <article class="studio-card">
      <div class="studio-card-head">
        <h2>Headerafbeelding</h2>
        ${renderStatusBadge(asset.status)}
      </div>
      ${renderDetailList([
        { label: "Titel", value: `<a class="studio-inline-link" href="${mediaDetailHref(asset)}">${escapeHtml(asset.title)}</a>`, html: true },
        { label: "Bestand", value: `<a class="studio-inline-link" href="${mediaDetailHref(asset)}"><code>${escapeHtml(asset.file)}</code></a>`, html: true },
        { label: "Gebruik", value: getMediaUsageTypeLabel(asset.usageType, mediaData) },
        { label: "Rechtenstatus", value: getMediaRightsStatusLabel(asset.rightsStatus, mediaData) },
        { label: "Alt-tekst", value: asset.alt }
      ])}
    </article>
  `;
}

export function renderArticleDetail({ article, articleData = {}, supplierData, brochureData, mediaData = {} }) {
  const relatedSuppliers = findArticleSuppliers(article, supplierData);
  const relatedBrochures = findArticleBrochures(article, brochureData);
  const heroAsset = findMediaAssetByPath(mediaData, article.heroImage);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData
  });
  const readiness = findReadinessByRoute(readinessReport, "articles", `#/kennisbank/${article.slug}`);

  return `
    ${renderPageHeader({
      eyebrow: "Kennisbankbeheer",
      title: article.title,
      description: "Bekijk gegevens, relaties en inhoud van een kennisbankartikel binnen de bewerkversie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar kennisbank", href: "#/kennisbank", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/kennisbank/${article.slug}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Alleen bewerkversie",
      message:
        "Deze detailweergave leest de bewerkversie. Het beheerbestand en de publieke website veranderen pas na Gegevens exporteren en Website bijwerken.",
      tone: "info"
    })}

    <section class="studio-section">
      ${renderReadinessCard(readiness)}
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Gegevens</h2>
        ${renderStatusBadge(article.status, getArticleStatusLabel(article.status))}
      </div>
      ${renderDetailList([
        { label: "ID", value: article.id },
        { label: "URL-naam", value: article.slug },
        { label: "Categorieen", value: (article.categories || []).join(", ") },
        { label: "Samenvatting", value: article.summary },
        { label: "Headerafbeelding", value: renderHeroImageValue(article, heroAsset), html: Boolean(heroAsset) },
        { label: "Bijgewerkt op", value: article.updatedAt },
        { label: "Sortering", value: String(article.sortOrder ?? 0) }
      ])}
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        <article class="studio-card">
          <h2>Gekoppelde leveranciers</h2>
          ${renderRelationList(relatedSuppliers, {
            emptyText: "Nog geen leverancier gekoppeld. Koppel een leverancier zodat bezoekers kunnen doorklikken naar het assortiment.",
            hrefForItem: (supplier) => `#/leveranciers/${supplier.slug}`,
            labelForItem: (supplier) => supplier.name,
            statusForItem: (supplier) => supplier.status,
            statusLabelForItem: (supplier) => getSupplierStatusLabel(supplier.status)
          })}
        </article>
        <article class="studio-card">
          <h2>Gekoppelde brochures</h2>
          ${renderRelationList(relatedBrochures, {
            emptyText: "Nog geen brochure gekoppeld. Koppel een brochure zodat bezoekers een collectie kunnen bekijken.",
            hrefForItem: (brochure) => `#/brochures/${brochure.slug}`,
            labelForItem: (brochure) => brochure.title,
            statusForItem: (brochure) => brochure.status,
            statusLabelForItem: (brochure) => getBrochureStatusLabel(brochure.status)
          })}
        </article>
      </div>
    </section>

    <section class="studio-section">
      ${renderHeroMedia(article, mediaData, heroAsset)}
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Inhoud</h2>
      </div>
      <article class="studio-card studio-article-body">
        ${bodyHtml(article.body)}
      </article>
    </section>
  `;
}
