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
import { findSupplierArticles, findSupplierBrochures } from "../../../../shared/content-relations.js";
import { getSupplierDeleteBlocker } from "../../../../shared/delete-guards.js";
import {
  getSupplierCounts,
  getSupplierStatusLabel,
  getSupplierTypeLabel,
  getSuppliers,
  sortSuppliers
} from "../../../../shared/supplier-model.js";
import { validateSupplier } from "../../../../shared/supplier-validation.js";
import { displayStatusForPublicModule, displayStatusLabelForPublicModule, isPublishedOnWebsite } from "../../../../shared/publication-status.js";
import { escapeHtml } from "../../../../shared/utils.js";
import {
  firstValidationMessage,
  renderBulkActionControls,
  renderBulkSelectControl,
  setupBulkActions
} from "../../shared/bulk-actions.js";
import {
  DEFAULT_SORT_OPTIONS,
  WEBSITE_STATUS_FILTER_OPTIONS,
  YES_NO_FILTER_OPTIONS,
  booleanFilterValue,
  createFilterTokens,
  createSearchText,
  filterToken,
  setupListControls
} from "../../shared/list-search.js";
import { setupSupplierImportExport } from "./import-export.js";

function renderSupplierActions(supplier) {
  return `
    <div class="studio-actions">
      ${renderButton({
        label: "Bekijken",
        href: `#/leveranciers/${supplier.slug}`,
        variant: "secondary",
        ariaLabel: `${supplier.name} bekijken`
      })}
      ${renderButton({
        label: "Bewerken",
        href: `#/leveranciers/${supplier.slug}/bewerken`,
        variant: "outline",
        ariaLabel: `${supplier.name} bewerken`
      })}
    </div>
  `;
}

function renderedSupplierStatus(supplier, publicData) {
  return displayStatusForPublicModule("suppliers", supplier, publicData);
}

function renderedSupplierStatusLabel(supplier, publicData) {
  return displayStatusLabelForPublicModule("suppliers", supplier, publicData);
}

function publicSupplierCount(suppliers, publicData) {
  return suppliers.filter((supplier) => renderedSupplierStatus(supplier, publicData) === "published").length;
}

function readySupplierCount(suppliers, publicData) {
  return suppliers.filter((supplier) => renderedSupplierStatus(supplier, publicData) === "ready").length;
}

function supplierListMetadata(supplier, { brochureData, articleData, publicData }) {
  const hasBrochure = findSupplierBrochures(supplier, brochureData).length > 0;
  const hasArticle = findSupplierArticles(supplier, articleData).length > 0;
  return {
    websiteStatus: isPublishedOnWebsite("suppliers", supplier, publicData) ? "live" : "not_live",
    hasBrochure: booleanFilterValue(hasBrochure),
    hasArticle: booleanFilterValue(hasArticle)
  };
}

function renderSupplierListAttributes(supplier, { brochureData, articleData, publicData }) {
  const status = renderedSupplierStatus(supplier, publicData);
  const metadata = supplierListMetadata(supplier, { brochureData, articleData, publicData });
  return `
    data-supplier-item
    data-list-id="${escapeHtml(supplier.id)}"
    data-search="${escapeHtml(createSearchText(
      supplier.name,
      supplier.slug,
      supplier.summary,
      supplier.description,
      supplier.categories,
      getSupplierTypeLabel(supplier.type)
    ))}"
    data-sort-name="${escapeHtml(supplier.name)}"
    data-sort-updated-at="${escapeHtml(supplier.updatedAt || "")}"
    data-sort-status="${escapeHtml(supplier.status)}"
    data-filter-workflow="${escapeHtml(supplier.status)}"
    data-filter-website="${escapeHtml(metadata.websiteStatus)}"
    data-filter-category="${escapeHtml(createFilterTokens(supplier.categories))}"
    data-filter-hasbrochure="${escapeHtml(metadata.hasBrochure)}"
    data-filter-hasarticle="${escapeHtml(metadata.hasArticle)}"
    data-filter-type="${escapeHtml(supplier.type)}"
    data-name="${escapeHtml(supplier.name.toLowerCase())}"
    data-status="${escapeHtml(status)}"
    data-type="${escapeHtml(supplier.type)}"
    data-categories="${escapeHtml((supplier.categories || []).join(" ").toLowerCase())}"
  `;
}

function renderSupplierCards(suppliers, publicData = {}, relationData = {}) {
  return suppliers
    .map((supplier) => {
      const status = renderedSupplierStatus(supplier, publicData);
      return `
      <article
        class="studio-card studio-supplier-card"
        ${renderSupplierListAttributes(supplier, { ...relationData, publicData })}
      >
        <div class="studio-card-head">
          <div>
            ${renderBulkSelectControl({ scope: "supplier", itemId: supplier.id, label: supplier.name })}
            <h3>${escapeHtml(supplier.name)}</h3>
            <p class="studio-muted">${escapeHtml(getSupplierTypeLabel(supplier.type))}</p>
          </div>
          ${renderStatusBadge(status, renderedSupplierStatusLabel(supplier, publicData))}
        </div>
        <p>${escapeHtml(supplier.summary)}</p>
        <p class="studio-meta">${escapeHtml((supplier.categories || []).join(", ") || "Geen categorieen")}</p>
        ${renderSupplierActions(supplier)}
      </article>
    `;
    })
    .join("");
}

function renderExportNotice(sessionSnapshot) {
  if (!sessionSnapshot.exportedCurrent) return "";

  return renderNotice({
    title: "Export gedownload",
    message:
      "De gegevens zijn gedownload. Vervang het beheerbestand en voer daarna npm run generate:public uit voor Website bijwerken.",
    tone: "success"
  });
}

function renderImportNotice(sessionSnapshot) {
  if (sessionSnapshot.sourceType !== "imported") return "";

  return renderNotice({
      title: "Geimporteerde bewerkversie actief",
      message: `${sessionSnapshot.sourceFileName} is geladen als bewerkversie. Importeren publiceert niets en past het beheerbestand niet direct aan.`,
    tone: "info"
  });
}

function categoryOptions(supplierData) {
  return [
    { value: "all", label: "Alle categorieen" },
    ...(supplierData.categories || []).map((category) => ({ value: filterToken(category), label: category }))
  ];
}

export function renderSuppliersList({ supplierData, brochureData, articleData, publicData = {}, sessionSnapshot }) {
  const suppliers = sortSuppliers(getSuppliers(supplierData));
  const counts = getSupplierCounts(supplierData);
  const publishedCount = publicSupplierCount(suppliers, publicData);
  const readyCount = readySupplierCount(suppliers, publicData);
  const typeOptions = [
    { value: "all", label: "Alle typen" },
    ...(supplierData.types || []).map((type) => ({ value: type.id, label: type.label }))
  ];
  const statusOptions = [
    { value: "all", label: "Alle statussen" },
    ...(supplierData.statuses || []).map((status) => ({ value: status, label: getSupplierStatusLabel(status) }))
  ];
  const relationData = { brochureData, articleData };

  const actions = `
    ${renderButton({ label: "Nieuwe leverancier", href: "#/leveranciers/nieuw", variant: "primary" })}
    ${renderButton({
      label: "Gegevens importeren",
      variant: "secondary",
      ariaLabel: "Leveranciersgegevens importeren",
      attributes: { "data-supplier-import-button": true }
    })}
    ${renderButton({
      label: "Gegevens exporteren",
      variant: "secondary",
      ariaLabel: "Leveranciersgegevens exporteren",
      attributes: { "data-supplier-export-button": true }
    })}
    ${renderFileInput({
      id: "supplier-import-file",
      accept: ".json",
      label: "suppliers.json importeren",
      attributes: { "data-supplier-import-file": true }
    })}
  `;

  return `
    ${renderPageHeader({
      eyebrow: "Leveranciersbeheer",
      title: "Leveranciers",
      description: "Beheer leveranciers, controleer hun status en zet complete gegevens klaar voor de publieke website."
    })}

    ${renderSessionBanner(sessionSnapshot)}
    ${renderImportNotice(sessionSnapshot)}
    ${renderExportNotice(sessionSnapshot)}

    ${renderNotice({
      title: "Bewerkversie",
      message:
        supplierData.storage?.message ||
        "Wijzigingen blijven in de bewerkversie. Gebruik Gegevens exporteren, vervang het beheerbestand en voer daarna npm run generate:public uit voor Website bijwerken.",
      tone: "warning"
    })}

    ${renderWorkflowPanel()}

    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport leveranciersbestand"
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-3">
        <article class="studio-card studio-metric-card">
          <h3>Totaal</h3>
          <p class="studio-metric-value">${counts.total}</p>
          <p class="studio-muted">In de bewerkversie geladen.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Gepubliceerd</h3>
          <p class="studio-metric-value">${publishedCount}</p>
          <p class="studio-muted">Staat in de publieke websitegegevens.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Gereed voor publicatie</h3>
          <p class="studio-metric-value">${readyCount}</p>
          <p class="studio-muted">Gecontroleerd in Studio; nog niet zichtbaar in de publieke dataset.</p>
        </article>
      </div>
    </section>

    ${renderFilterToolbar({
      scope: "supplier",
      searchPlaceholder: "Zoek op naam, URL-naam of categorie",
      filters: [
        { name: "workflow", label: "Workflowstatus", options: statusOptions },
        { name: "website", label: "Websitestatus", options: WEBSITE_STATUS_FILTER_OPTIONS },
        { name: "category", label: "Categorie", options: categoryOptions(supplierData) },
        { name: "hasbrochure", label: "Heeft brochure", options: YES_NO_FILTER_OPTIONS },
        { name: "hasarticle", label: "Heeft kennisartikel", options: YES_NO_FILTER_OPTIONS },
        { name: "type", label: "Type", options: typeOptions }
      ],
      sortOptions: DEFAULT_SORT_OPTIONS,
      actions
    })}

    ${renderBulkActionControls({ scope: "supplier", moduleLabelPlural: "leveranciers" })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-2" data-supplier-card-list>${renderSupplierCards(suppliers, publicData, relationData)}</div>
      <div class="studio-list-empty" data-supplier-empty hidden>
        <p data-supplier-empty-message>Geen leveranciers gevonden met deze zoekterm of filters.</p>
        ${renderButton({ label: "Filters wissen", variant: "secondary", attributes: { "data-supplier-empty-clear": true } })}
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Tabelweergave</h2>
      </div>
      ${renderDataTable({
        label: "Leveranciersoverzicht",
        rows: suppliers,
        rowAttributes: (supplier) => renderSupplierListAttributes(supplier, { ...relationData, publicData }),
        columns: [
          {
            label: "Selectie",
            render: (supplier) => renderBulkSelectControl({ scope: "supplier", itemId: supplier.id, label: supplier.name })
          },
          {
            label: "Naam",
            render: (supplier) => `<strong>${escapeHtml(supplier.name)}</strong><br><span>${escapeHtml(supplier.slug)}</span>`
          },
          {
            label: "Type",
            render: (supplier) => escapeHtml(getSupplierTypeLabel(supplier.type))
          },
          {
            label: "Categorieen",
            render: (supplier) => escapeHtml((supplier.categories || []).join(", ") || "Geen categorieen")
          },
          {
            label: "Status",
            render: (supplier) => renderStatusBadge(
              renderedSupplierStatus(supplier, publicData),
              renderedSupplierStatusLabel(supplier, publicData)
            )
          },
          {
            label: "Acties",
            render: renderSupplierActions
          }
        ]
      })}
    </section>
  `;
}

function findSupplierById(supplierData, id) {
  return getSuppliers(supplierData).find((supplier) => supplier.id === id) || null;
}

export function setupSupplierList({ supplierSession, brochureSession, articleSession, rerender, restoreDraft, persistDraft }) {
  setupSupplierImportExport({ supplierSession, rerender, restoreDraft });
  setupListControls({
    scope: "supplier",
    itemSelector: "[data-supplier-item]",
    emptySelector: "[data-supplier-empty]",
    emptyText: "Geen leveranciers gevonden met de huidige zoekterm of filters."
  });
  setupBulkActions({
    scope: "supplier",
    itemSelector: "[data-supplier-item]",
    moduleLabelSingular: "leverancier",
    moduleLabelPlural: "leveranciers",
    findItem: (id) => findSupplierById(supplierSession.getWorkingData(), id),
    getItemLabel: (supplier) => supplier.name,
    applyItem: (supplier, originalSupplier) => supplierSession.applySupplier(supplier, originalSupplier.slug),
    validateStatusChange: (supplier, originalSupplier) =>
      firstValidationMessage(validateSupplier(supplier, getSuppliers(supplierSession.getWorkingData()), {
        originalSlug: originalSupplier.slug
      })),
    deleteItem: (supplier) => supplierSession.deleteSupplier(supplier.slug),
    getDeleteBlocker: (supplier) =>
      getSupplierDeleteBlocker({
        supplier,
        brochureData: brochureSession?.getWorkingData(),
        articleData: articleSession?.getWorkingData()
      }),
    persistChanges: persistDraft,
    rerender
  });
}
