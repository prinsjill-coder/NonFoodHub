import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import { getBrochures } from "../../../../shared/brochure-model.js";
import { getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

function namesById(items, labelKey) {
  return new Map(items.map((item) => [item.id, item[labelKey]]));
}

function namesFor(ids, map) {
  return (ids || []).map((id) => map.get(id) || id).join(", ");
}

function bodyHtml(body) {
  return escapeHtml(body)
    .split("\n")
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
}

export function renderArticleDetail({ article, supplierData, brochureData }) {
  const suppliersById = namesById(getSuppliers(supplierData), "name");
  const brochuresById = namesById(getBrochures(brochureData), "title");

  return `
    ${renderPageHeader({
      eyebrow: "Kennisbankbeheer",
      title: article.title,
      description: "Bekijk metadata, relaties en inhoud van een kennisbankartikel binnen de actieve Studio-werksessie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar kennisbank", href: "#/kennisbank", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/kennisbank/${article.slug}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Registry zonder publieke rendering",
      message:
        "Dit artikel bestaat alleen in de Studio-contentregistry. De publieke website leest deze kennisbankdata nog niet.",
      tone: "info"
    })}

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Metadata</h2>
        ${renderStatusBadge(article.status, getArticleStatusLabel(article.status))}
      </div>
      ${renderDetailList([
        { label: "ID", value: article.id },
        { label: "Slug", value: article.slug },
        { label: "Categorieen", value: (article.categories || []).join(", ") },
        { label: "Samenvatting", value: article.summary },
        { label: "Hero afbeelding", value: article.heroImage },
        { label: "Leveranciers", value: namesFor(article.supplierIds, suppliersById) },
        { label: "Brochures", value: namesFor(article.brochureIds, brochuresById) },
        { label: "Bijgewerkt op", value: article.updatedAt },
        { label: "Sortering", value: String(article.sortOrder ?? 0) }
      ])}
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
