import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderDataTable } from "../../../../components/data-table.js";
import { renderFilterToolbar } from "../../../../components/filter-toolbar.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderSessionBanner } from "../../../../components/session-banner.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { renderValidationReport } from "../../../../components/validation-report.js";
import {
  getArticleCounts,
  getArticles,
  getArticleStatusLabel,
  sortArticles
} from "../../../../shared/article-model.js";
import { getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

function supplierNameById(supplierData) {
  return new Map(getSuppliers(supplierData).map((supplier) => [supplier.id, supplier.name]));
}

function renderArticleActions(article) {
  return `
    <div class="studio-actions">
      ${renderButton({
        label: "Bekijken",
        href: `#/kennisbank/${article.slug}`,
        variant: "secondary",
        ariaLabel: `${article.title} bekijken`
      })}
      ${renderButton({
        label: "Bewerken",
        href: `#/kennisbank/${article.slug}/bewerken`,
        variant: "outline",
        ariaLabel: `${article.title} bewerken`
      })}
    </div>
  `;
}

function supplierNames(article, suppliersById) {
  return (article.supplierIds || []).map((supplierId) => suppliersById.get(supplierId) || supplierId);
}

function renderArticleCards(articles, suppliersById) {
  return articles
    .map((article) => {
      const suppliers = supplierNames(article, suppliersById);
      return `
        <article
          class="studio-card studio-article-card"
          data-article-item
          data-title="${escapeHtml(`${article.title} ${article.slug} ${article.summary}`.toLowerCase())}"
          data-status="${escapeHtml(article.status)}"
          data-categories="${escapeHtml((article.categories || []).join(" ").toLowerCase())}"
        >
          <div class="studio-card-head">
            <div>
              <h3>${escapeHtml(article.title)}</h3>
              <p class="studio-muted">${escapeHtml((article.categories || []).join(", ") || "Geen categorie")}</p>
            </div>
            ${renderStatusBadge(article.status, getArticleStatusLabel(article.status))}
          </div>
          <p>${escapeHtml(article.summary)}</p>
          <p class="studio-meta">${escapeHtml(suppliers.join(", ") || "Geen leveranciers gekoppeld")}</p>
          <p class="studio-meta">Bijgewerkt op ${escapeHtml(article.updatedAt || "niet ingevuld")}</p>
          ${renderArticleActions(article)}
        </article>
      `;
    })
    .join("");
}

function renderArticleTable(articles, suppliersById) {
  return renderDataTable({
    label: "Kennisbankartikelen",
    rows: articles,
    rowAttributes: (article) => `
      data-article-item
      data-title="${escapeHtml(`${article.title} ${article.slug} ${article.summary}`.toLowerCase())}"
      data-status="${escapeHtml(article.status)}"
      data-categories="${escapeHtml((article.categories || []).join(" ").toLowerCase())}"
    `,
    columns: [
      {
        label: "Artikel",
        render: (article) => `<strong>${escapeHtml(article.title)}</strong><br><span>${escapeHtml(article.slug)}</span>`
      },
      {
        label: "Categorie",
        render: (article) => escapeHtml((article.categories || []).join(", ") || "Geen categorie")
      },
      {
        label: "Leveranciers",
        render: (article) => escapeHtml(supplierNames(article, suppliersById).join(", ") || "Geen leveranciers")
      },
      {
        label: "Bijgewerkt",
        render: (article) => escapeHtml(article.updatedAt || "Niet ingevuld")
      },
      {
        label: "Status",
        render: (article) => renderStatusBadge(article.status, getArticleStatusLabel(article.status))
      },
      {
        label: "Acties",
        render: renderArticleActions
      }
    ]
  });
}

function statusOptions(articleData) {
  return [
    { value: "all", label: "Alle statussen" },
    ...(articleData.statuses || []).map((status) => ({ value: status, label: getArticleStatusLabel(status) }))
  ];
}

function categoryOptions(articleData) {
  return [
    { value: "all", label: "Alle categorieen" },
    ...(articleData.categories || []).map((category) => ({ value: category.toLowerCase(), label: category }))
  ];
}

function renderSessionStatus(snapshot) {
  if (snapshot.dirty) return "Niet-opgeslagen kennisbankwijzigingen";
  return "Gelijk aan geladen bron";
}

export function renderArticlesList({ articleData, supplierData, sessionSnapshot }) {
  const articles = sortArticles(getArticles(articleData));
  const counts = getArticleCounts(articleData);
  const suppliersById = supplierNameById(supplierData);
  const actions = renderButton({ label: "Nieuw artikel", href: "#/kennisbank/nieuw", variant: "primary" });

  return `
    ${renderPageHeader({
      eyebrow: "Kennisbankbeheer",
      title: "Kennisbank",
      description: "Registreer inspiratie- en kennisbankartikelen binnen de statische Studio-werksessie."
    })}

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "articles.json",
      sourceDescription:
        "Wijzigingen bestaan alleen in browsergeheugen. Import, export en publieke rendering voor kennisbankartikelen zijn in deze sprint niet actief.",
      statusText: renderSessionStatus,
      restoreLabel: "Kennisbanksessie herstellen",
      restoreAttributes: { "data-article-restore": true }
    })}

    ${renderNotice({
      title: "Kennisbankregistry zonder publicatie",
      message:
        articleData.storage?.message ||
        "Artikelen worden alleen als contentregistry beheerd. Studio publiceert niets en schrijft niets naar data/articles.json.",
      tone: "warning"
    })}

    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport kennisbank"
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-3">
        <article class="studio-card studio-metric-card">
          <h3>Totaal</h3>
          <p class="studio-metric-value">${counts.total}</p>
          <p class="studio-muted">Gelezen uit de actieve werksessie.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Ter controle</h3>
          <p class="studio-metric-value">${counts.statuses.review || 0}</p>
          <p class="studio-muted">Contentstatus; publiceert niets automatisch.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Afbeelding ontbreekt</h3>
          <p class="studio-metric-value">${counts.missingHeroImage}</p>
          <p class="studio-muted">Artikelen zonder hero-afbeeldingpad.</p>
        </article>
      </div>
    </section>

    ${renderFilterToolbar({
      scope: "article",
      ariaLabel: "Kennisbankfilters",
      searchPlaceholder: "Zoek op titel, slug of samenvatting",
      filters: [
        { name: "status", label: "Status", options: statusOptions(articleData) },
        { name: "category", label: "Categorie", options: categoryOptions(articleData) }
      ],
      actions
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-2" data-article-card-list>${renderArticleCards(articles, suppliersById)}</div>
      <div class="studio-list-empty" data-article-empty hidden>
        Geen kennisbankartikelen gevonden met deze filters.
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Tabelweergave</h2>
      </div>
      ${renderArticleTable(articles, suppliersById)}
    </section>
  `;
}

export function setupArticleList({ articleSession, rerender }) {
  const search = document.querySelector("[data-article-search]");
  const filters = Array.from(document.querySelectorAll("[data-article-filter]"));
  const items = Array.from(document.querySelectorAll("[data-article-item]"));
  const empty = document.querySelector("[data-article-empty]");
  const restoreButton = document.querySelector("[data-article-restore]");

  function applyFilters() {
    const query = search?.value.trim().toLowerCase() || "";
    const values = Object.fromEntries(filters.map((filter) => [filter.dataset.articleFilter, filter.value]));
    let visibleCount = 0;

    items.forEach((item) => {
      const matchesSearch = !query || (item.dataset.title || "").includes(query);
      const matchesStatus = values.status === "all" || item.dataset.status === values.status;
      const matchesCategory = values.category === "all" || (item.dataset.categories || "").includes(values.category);
      const visible = matchesSearch && matchesStatus && matchesCategory;
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (empty) {
      empty.hidden = visibleCount > 0;
    }
  }

  search?.addEventListener("input", applyFilters);
  filters.forEach((filter) => filter.addEventListener("change", applyFilters));
  restoreButton?.addEventListener("click", async () => {
    if (articleSession.snapshot().dirty) {
      const confirmed = await confirmStudioAction({
        title: "Kennisbanksessie herstellen?",
        message:
          "De actieve kennisbankwerksessie wijkt af van de geladen bron. Als je doorgaat, worden deze werksessiewijzigingen verworpen.",
        confirmLabel: "Sessie herstellen",
        cancelLabel: "Annuleren",
        tone: "warning"
      });
      if (!confirmed) return;
    }

    articleSession.restoreSource();
    rerender();
  });

  applyFilters();
}
