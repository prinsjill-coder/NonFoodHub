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

function fileNameFromPath(path) {
  return String(path || "").split(/[\\/]/).filter(Boolean).at(-1) || "";
}

function renderPresenceBadge(path, label) {
  if (!path) {
    return `<span class="studio-badge is-review">${escapeHtml(label)} aanwezig: Nee, geen pad ingevuld</span>`;
  }

  return `<span class="studio-badge is-foundation" data-file-presence data-file-path="${escapeHtml(path)}" data-file-label="${escapeHtml(label)}">${escapeHtml(label)} aanwezig: Nog niet gecontroleerd</span>`;
}

function renderFileStatusCard({ title, path, fileLabel, emptyText }) {
  const fileName = fileNameFromPath(path);

  return `
    <article class="studio-card studio-file-status-card">
      <h2>${escapeHtml(title)}</h2>
      <dl class="studio-file-status-list">
        <div>
          <dt>Huidig pad</dt>
          <dd class="${path ? "studio-meta" : "studio-muted"}">${escapeHtml(path || emptyText)}</dd>
        </div>
        <div>
          <dt>Verwachte bestandsnaam</dt>
          <dd class="${fileName ? "studio-meta" : "studio-muted"}">${escapeHtml(fileName || "Nog niet bekend")}</dd>
        </div>
        <div>
          <dt>Bestandscontrole</dt>
          <dd>${renderPresenceBadge(path, fileLabel)}</dd>
        </div>
      </dl>
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
      title: "Alleen deze Studio-sessie",
      message:
        "Deze detailweergave leest de actieve Studio-sessie. Het beheerbestand en de publieke website veranderen pas na handmatige overdracht.",
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
        ${renderFileStatusCard({
          title: "PDF-pad",
          path: brochure.pdfFile,
          fileLabel: "PDF",
          emptyText: "Geen PDF gekoppeld. Dit is toegestaan bij concepten."
        })}
        ${renderFileStatusCard({
          title: "Thumbnailpad",
          path: brochure.thumbnail,
          fileLabel: "Thumbnail",
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

function pathIsSafeForLocalCheck(path) {
  const value = String(path || "");
  return (
    value &&
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.startsWith("~") &&
    !value.toLowerCase().startsWith("file:") &&
    !/^[a-zA-Z]:[\\/]/.test(value)
  );
}

function studioRelativeAssetUrl(path) {
  const pageUrl = window.location.href.split("#")[0];
  return new URL(`../${path}`, pageUrl).href;
}

async function localFileExists(path) {
  if (!pathIsSafeForLocalCheck(path)) return false;

  try {
    const response = await fetch(studioRelativeAssetUrl(path), { method: "HEAD", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

export function setupBrochureFileStatus() {
  document.querySelectorAll("[data-file-presence]").forEach(async (element) => {
    const path = element.dataset.filePath || "";
    const label = element.dataset.fileLabel || "Bestand";
    const exists = await localFileExists(path);

    element.classList.remove("is-foundation", "is-review", "is-success");
    element.classList.add(exists ? "is-success" : "is-review");
    element.textContent = `${label} aanwezig: ${exists ? "Ja" : "Nee"}`;
  });
}
