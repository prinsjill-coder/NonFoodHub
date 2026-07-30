import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import {
  getBrochureLanguageLabel,
  getBrochureStatusLabel
} from "../../../../shared/brochure-model.js";
import { getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

function supplierNameForId(supplierData, supplierId) {
  return getSuppliers(supplierData).find((supplier) => supplier.id === supplierId)?.name || "Onbekende leverancier";
}

function renderReferenceCard({ title, value, emptyText }) {
  return `
    <article class="studio-card">
      <h2>${escapeHtml(title)}</h2>
      <p class="${value ? "studio-meta" : "studio-muted"}">${escapeHtml(value || emptyText)}</p>
    </article>
  `;
}

export function renderBrochureDetail({ brochureData, supplierData, brochure }) {
  const supplierName = supplierNameForId(supplierData, brochure.supplierId);

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
      <div class="studio-grid studio-grid-2">
        <article class="studio-card">
          <div class="studio-card-head">
            <h2>Basisgegevens</h2>
            ${renderStatusBadge(brochure.status, getBrochureStatusLabel(brochure.status))}
          </div>
          ${renderDetailList([
            { label: "Titel", value: brochure.title },
            { label: "Slug", value: brochure.slug },
            { label: "Leverancier", value: supplierName },
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
  `;
}
