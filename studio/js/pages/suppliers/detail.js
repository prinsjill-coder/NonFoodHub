import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
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

export function renderSupplierDetail({ supplierData, supplier }) {
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
      title: "Alleen Studio-preview",
      message: "Deze detailweergave leest demo-data uit data/suppliers.json en wijzigt de publieke website nog niet.",
      tone: "info"
    })}

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
          <p class="studio-muted">Relaties met brochures zijn voorbereid via <code>brochureIds</code>, maar brochurebeheer valt buiten Sprint 2.</p>
          <p class="studio-meta">${escapeHtml((supplier.brochureIds || []).join(", ") || "Geen brochures gekoppeld")}</p>
        </article>
        <article class="studio-card">
          <h2>Kennisbank</h2>
          <p class="studio-muted">Relaties met kennisbankartikelen zijn voorbereid via <code>relatedArticleIds</code>, maar kennisbankbeheer valt buiten Sprint 2.</p>
          <p class="studio-meta">${escapeHtml((supplier.relatedArticleIds || []).join(", ") || "Geen artikelen gekoppeld")}</p>
        </article>
      </div>
    </section>
  `;
}

