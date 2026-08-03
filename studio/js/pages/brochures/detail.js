import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import {
  getBrochureLanguageLabel,
  getBrochureStatusLabel
} from "../../../../shared/brochure-model.js";
import { findBrochureArticles } from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import { getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

function supplierForId(supplierData, supplierId) {
  return getSuppliers(supplierData).find((supplier) => supplier.id === supplierId) || null;
}

function renderSupplierReference(supplier) {
  if (!supplier) {
    return "Onbekende leverancier";
  }

  return `<a class="studio-inline-link" href="#/leveranciers/${escapeHtml(supplier.slug)}">${escapeHtml(supplier.name)}</a>`;
}

function renderReferenceCard({ title, value, emptyText }) {
  return `
    <article class="studio-card">
      <h2>${escapeHtml(title)}</h2>
      <p class="${value ? "studio-meta" : "studio-muted"}">${escapeHtml(value || emptyText)}</p>
    </article>
  `;
}

function renderArticleRelations(articles) {
  if (!articles.length) {
    return `<p class="studio-muted">Geen kennisbankartikelen gekoppeld.</p>`;
  }

  return `
    <ul class="studio-relation-list">
      ${articles
        .map((article) => `
          <li>
            <a href="#/kennisbank/${escapeHtml(article.slug)}">${escapeHtml(article.title)}</a>
            ${renderStatusBadge(article.status, getArticleStatusLabel(article.status))}
          </li>
        `)
        .join("")}
    </ul>
  `;
}

export function renderBrochureDetail({ brochureData, supplierData, articleData = {}, brochure }) {
  const supplier = supplierForId(supplierData, brochure.supplierId);
  const relatedArticles = findBrochureArticles(brochure, articleData);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    articles: articleData
  });
  const readiness = findReadinessByRoute(readinessReport, "brochures", `#/brochures/${brochure.slug}`);

  return `
    ${renderPageHeader({
      eyebrow: "Brochure bekijken",
      title: brochure.title,
      description: brochure.description || "Geen beschrijving ingevuld."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar brochures", href: "#/brochures", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/brochures/${brochure.slug}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Alleen Studio-werksessie",
      message:
        "Deze detailweergave leest de actieve browserdata. Dit schrijft niet naar /data/brochures.json en wijzigt de publieke website niet.",
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
            ${renderStatusBadge(brochure.status, getBrochureStatusLabel(brochure.status))}
          </div>
          ${renderDetailList([
            { label: "Titel", value: brochure.title },
            { label: "Slug", value: brochure.slug },
            { label: "Leverancier", value: renderSupplierReference(supplier), html: Boolean(supplier) },
            { label: "Jaar", value: brochure.year ? String(brochure.year) : "Geen jaar" },
            { label: "Categorieen", value: (brochure.categories || []).join(", ") || "Geen categorieen" },
            { label: "Taal", value: getBrochureLanguageLabel(brochure.language, brochureData) },
            { label: "Sortering", value: String(brochure.sortOrder ?? 0) },
            { label: "Bijgewerkt", value: brochure.updatedAt }
          ])}
        </article>
        <article class="studio-card">
          <h2>Beschrijving</h2>
          <p>${escapeHtml(brochure.description || "Geen beschrijving ingevuld.")}</p>
        </article>
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        ${renderReferenceCard({
          title: "PDF-pad",
          value: brochure.pdfFile,
          emptyText: "Geen PDF gekoppeld. Dit is toegestaan bij concepten."
        })}
        ${renderReferenceCard({
          title: "Thumbnailpad",
          value: brochure.thumbnail,
          emptyText: "Geen thumbnail gekoppeld."
        })}
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Kennisbankartikelen</h2>
      </div>
      <article class="studio-card">
        ${renderArticleRelations(relatedArticles)}
      </article>
    </section>
  `;
}
