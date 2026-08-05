import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderDataTable } from "../../../../components/data-table.js";
import { renderFileInput } from "../../../../components/file-input.js";
import { renderFilterToolbar } from "../../../../components/filter-toolbar.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderSessionBanner } from "../../../../components/session-banner.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { renderValidationReport } from "../../../../components/validation-report.js";
import { renderWorkflowPanel } from "../../../../components/workflow-panel.js";
import {
  getArticleCounts,
  getArticles,
  getArticleStatusLabel,
  sortArticles
} from "../../../../shared/article-model.js";
import { getArticleQualityReport } from "../../../../shared/article-quality.js";
import { getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { setupArticleExport } from "./export.js";
import { setupArticleImport } from "./import.js";

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
  if (snapshot.exportedCurrent) return "Gegevens geexporteerd, website nog niet bijgewerkt";
  if (snapshot.hasUnexportedChanges) return "Wijzigingen nog niet geexporteerd";
  if (snapshot.dirty) return "Bewerkversie wijkt af van het geladen bestand";
  return "Gelijk aan het geladen bestand";
}

function renderExportNotice(sessionSnapshot) {
  if (!sessionSnapshot.exportedCurrent) return "";

  return renderNotice({
    title: "Export gedownload",
    message:
      "De gegevens zijn gedownload. Gebruik daarna Website bijwerken om de publieke gegevens klaar te zetten.",
    tone: "success"
  });
}

function renderImportNotice(sessionSnapshot) {
  if (sessionSnapshot.sourceType !== "imported") return "";

  return renderNotice({
    title: "Geimporteerde kennisbankgegevens actief",
    message: `${sessionSnapshot.sourceFileName} is geladen als bewerkversie. Importeren publiceert niets en past het beheerbestand niet direct aan.`,
    tone: "info"
  });
}

function renderImportSummary(report) {
  if (report?.action !== "import" || typeof report.itemCount !== "number") return "";

  return renderNotice({
    title: report.valid ? "Artikelbestand gevalideerd" : "Artikelbestand niet geaccepteerd",
    message: `${report.sourceFileName || "Het geselecteerde bestand"} bevat ${report.itemCount} artikelen. Controleer het validatierapport hieronder.`,
    tone: report.valid ? "info" : "warning"
  });
}

function renderQualitySummary(qualityReport) {
  return `
    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Contentkwaliteit</h2>
        ${renderStatusBadge(qualityReport.valid ? "success" : "review")}
      </div>
      <div class="studio-grid studio-grid-4">
        <article class="studio-card studio-metric-card">
          <h3>Gepubliceerd</h3>
          <p class="studio-metric-value">${qualityReport.stats.published}</p>
          <p class="studio-muted">Contentstatus; publiceert niets automatisch.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Waarschuwingen</h3>
          <p class="studio-metric-value">${qualityReport.stats.warnings}</p>
          <p class="studio-muted">Relaties, mediaregistraties en conceptkwaliteit.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Mediaregistratie ontbreekt</h3>
          <p class="studio-metric-value">${qualityReport.stats.missingMediaRegistrations}</p>
          <p class="studio-muted">Headerafbeeldingen die nog niet in Media staan.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Blokkades</h3>
          <p class="studio-metric-value">${qualityReport.errors.length}</p>
          <p class="studio-muted">Moeten worden opgelost voor professionele publicatie.</p>
        </article>
      </div>
    </section>
  `;
}

export function renderArticlesList({ articleData, supplierData, brochureData, mediaData, sessionSnapshot }) {
  const articles = sortArticles(getArticles(articleData));
  const counts = getArticleCounts(articleData);
  const qualityReport = getArticleQualityReport(articleData, supplierData, brochureData, mediaData);
  const suppliersById = supplierNameById(supplierData);
  const actions = `
    ${renderButton({ label: "Nieuw artikel", href: "#/kennisbank/nieuw", variant: "primary" })}
    ${renderButton({
      label: "Gegevens importeren",
      variant: "secondary",
      ariaLabel: "Artikelgegevens importeren",
      attributes: { "data-article-import-button": true }
    })}
    ${renderButton({
      label: "Gegevens exporteren",
      variant: "secondary",
      ariaLabel: "Artikelgegevens exporteren",
      attributes: { "data-article-export-button": true }
    })}
    ${renderFileInput({
      id: "article-import-file",
      accept: ".json",
      label: "articles.json importeren",
      attributes: { "data-article-import-file": true }
    })}
  `;

  return `
    ${renderPageHeader({
      eyebrow: "Kennisbankbeheer",
      title: "Kennisbank",
      description: "Beheer inspiratieartikelen, controleer relaties en zet complete artikelen klaar voor de publieke website."
    })}

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "articles.json",
      sourceDescription:
        "Wijzigingen blijven alleen in de bewerkversie totdat je artikelgegevens exporteert.",
      exportMessage:
        "De gegevens zijn gedownload. Gebruik daarna Website bijwerken om de publieke gegevens klaar te zetten.",
      statusText: renderSessionStatus,
      restoreLabel: "Bewerkversie herstellen",
      restoreAttributes: { "data-article-restore": true }
    })}

    ${renderImportNotice(sessionSnapshot)}
    ${renderExportNotice(sessionSnapshot)}
    ${renderImportSummary(sessionSnapshot.lastValidationReport)}

    ${renderNotice({
      title: "Bewerkversie",
      message:
        articleData.storage?.message ||
        "Wijzigingen blijven in de bewerkversie. Gebruik Gegevens exporteren voordat je Website bijwerken gebruikt.",
      tone: "warning"
    })}

    ${renderWorkflowPanel()}

    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport kennisbank"
    })}

    ${renderValidationReport({
      valid: qualityReport.valid,
      errors: qualityReport.errors,
      warnings: qualityReport.warnings,
      sourceFileName: "actieve bewerkversie"
    }, {
      title: "Kwaliteitsrapport kennisbank"
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-3">
        <article class="studio-card studio-metric-card">
          <h3>Totaal</h3>
          <p class="studio-metric-value">${counts.total}</p>
          <p class="studio-muted">In de bewerkversie geladen.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Review</h3>
          <p class="studio-metric-value">${counts.statuses.review || 0}</p>
          <p class="studio-muted">Contentstatus; publiceert niets automatisch.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Afbeelding ontbreekt</h3>
          <p class="studio-metric-value">${counts.missingHeroImage}</p>
          <p class="studio-muted">Artikelen zonder bestand van de headerafbeelding.</p>
        </article>
      </div>
    </section>

    ${renderQualitySummary(qualityReport)}

    ${renderFilterToolbar({
      scope: "article",
      ariaLabel: "Kennisbankfilters",
      searchPlaceholder: "Zoek op titel, URL-naam of samenvatting",
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

export function setupArticleList({ articleSession, supplierSession, brochureSession, mediaSession, rerender, restoreDraft }) {
  const search = document.querySelector("[data-article-search]");
  const filters = Array.from(document.querySelectorAll("[data-article-filter]"));
  const items = Array.from(document.querySelectorAll("[data-article-item]"));
  const empty = document.querySelector("[data-article-empty]");
  const restoreButton = document.querySelector("[data-article-restore]");

  setupArticleImport({ articleSession, supplierSession, brochureSession, mediaSession, rerender });
  setupArticleExport({ articleSession, rerender });

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
        title: "Bewerkversie herstellen?",
        message:
          "De bewerkversie wijkt af van het geladen bestand. Als je doorgaat, worden deze wijzigingen verworpen.",
        confirmLabel: "Bewerkversie herstellen",
        cancelLabel: "Annuleren",
        tone: "warning"
      });
      if (!confirmed) return;
    }

    if (restoreDraft) {
      await restoreDraft();
    } else {
      articleSession.restoreSource();
    }
    rerender();
  });

  applyFilters();
}
