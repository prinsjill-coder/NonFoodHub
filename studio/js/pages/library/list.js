import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderDataTable } from "../../../../components/data-table.js";
import { renderFilterToolbar } from "../../../../components/filter-toolbar.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderSessionBanner } from "../../../../components/session-banner.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { renderValidationReport } from "../../../../components/validation-report.js";
import { renderWorkflowPanel } from "../../../../components/workflow-panel.js";
import {
  getLibraryCounts,
  getLibraryItems,
  getLibraryStatusLabel,
  getLibraryTypeLabel,
  sortLibraryItems
} from "../../../../shared/library-model.js";
import { getLibraryQualityReport } from "../../../../shared/library-quality.js";
import { getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { createSearchText, matchesSearch, readFilterValues, setupSearchInput } from "../../shared/list-search.js";

function supplierNameById(supplierData) {
  return new Map(getSuppliers(supplierData).map((supplier) => [supplier.id, supplier.name]));
}

function supplierNames(item, suppliersById) {
  return (item.supplierIds || []).map((supplierId) => suppliersById.get(supplierId) || supplierId);
}

function renderLibraryActions(item) {
  return `
    <div class="studio-actions">
      ${renderButton({
        label: "Bekijken",
        href: `#/bibliotheek/${item.slug}`,
        variant: "secondary",
        ariaLabel: `${item.title} bekijken`
      })}
      ${renderButton({
        label: "Bewerken",
        href: `#/bibliotheek/${item.slug}/bewerken`,
        variant: "outline",
        ariaLabel: `${item.title} bewerken`
      })}
    </div>
  `;
}

function renderLibraryCards(items, libraryData, suppliersById) {
  return items
    .map((item) => {
      const suppliers = supplierNames(item, suppliersById);
      return `
        <article
          class="studio-card studio-library-card"
          data-library-item
          data-search="${escapeHtml(createSearchText(
            item.title,
            item.slug,
            item.summary,
            item.category,
            getLibraryTypeLabel(item.type, libraryData),
            suppliers,
            item.filePath,
            item.thumbnailPath,
            item.url
          ))}"
          data-title="${escapeHtml(`${item.title} ${item.slug} ${item.summary}`.toLowerCase())}"
          data-status="${escapeHtml(item.status)}"
          data-type="${escapeHtml(item.type)}"
          data-category="${escapeHtml(item.category)}"
        >
          <div class="studio-card-head">
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p class="studio-muted">${escapeHtml(item.category)} · ${escapeHtml(getLibraryTypeLabel(item.type, libraryData))}</p>
            </div>
            ${renderStatusBadge(item.status, getLibraryStatusLabel(item.status))}
          </div>
          <p>${escapeHtml(item.summary)}</p>
          <p class="studio-meta">${escapeHtml(suppliers.join(", ") || "Geen leveranciers gekoppeld")}</p>
          <p class="studio-meta">Bijgewerkt op ${escapeHtml(item.updatedAt || "niet ingevuld")}</p>
          ${renderLibraryActions(item)}
        </article>
      `;
    })
    .join("");
}

function renderLibraryTable(items, libraryData, suppliersById) {
  return renderDataTable({
    label: "Bibliotheekitems",
    rows: items,
    rowAttributes: (item) => `
      data-library-item
      data-search="${escapeHtml(createSearchText(
        item.title,
        item.slug,
        item.summary,
        item.category,
        getLibraryTypeLabel(item.type, libraryData),
        supplierNames(item, suppliersById),
        item.filePath,
        item.thumbnailPath,
        item.url
      ))}"
      data-title="${escapeHtml(`${item.title} ${item.slug} ${item.summary}`.toLowerCase())}"
      data-status="${escapeHtml(item.status)}"
      data-type="${escapeHtml(item.type)}"
      data-category="${escapeHtml(item.category)}"
    `,
    columns: [
      {
        label: "Item",
        render: (item) => `<strong>${escapeHtml(item.title)}</strong><br><span>${escapeHtml(item.slug)}</span>`
      },
      {
        label: "Type",
        render: (item) => escapeHtml(getLibraryTypeLabel(item.type, libraryData))
      },
      {
        label: "Categorie",
        render: (item) => escapeHtml(item.category)
      },
      {
        label: "Leveranciers",
        render: (item) => escapeHtml(supplierNames(item, suppliersById).join(", ") || "Geen leveranciers")
      },
      {
        label: "Status",
        render: (item) => renderStatusBadge(item.status, getLibraryStatusLabel(item.status))
      },
      {
        label: "Acties",
        render: renderLibraryActions
      }
    ]
  });
}

function statusOptions(libraryData) {
  return [
    { value: "all", label: "Alle statussen" },
    ...(libraryData.statuses || []).map((status) => ({ value: status, label: getLibraryStatusLabel(status) }))
  ];
}

function typeOptions(libraryData) {
  return [
    { value: "all", label: "Alle types" },
    ...(libraryData.types || []).map((type) => ({ value: type, label: getLibraryTypeLabel(type, libraryData) }))
  ];
}

function categoryOptions(libraryData) {
  return [
    { value: "all", label: "Alle categorieen" },
    ...(libraryData.categories || []).map((category) => ({ value: category, label: category }))
  ];
}

function renderSessionStatus(snapshot) {
  if (snapshot.exportedCurrent) return "Gegevens geexporteerd, overdracht nog niet bevestigd";
  if (snapshot.hasUnexportedChanges) return "Wijzigingen nog niet geexporteerd";
  if (snapshot.dirty) return "Bewerkversie wijkt af van het geladen bestand";
  return "Gelijk aan het geladen bestand";
}

function renderExportNotice(sessionSnapshot) {
  if (!sessionSnapshot.exportedCurrent) return "";

  return renderNotice({
    title: "Export gedownload",
    message:
      "De gegevens zijn gedownload. Draag het beheerbestand handmatig over en gebruik daarna Website bijwerken.",
    tone: "success"
  });
}

function renderImportNotice(sessionSnapshot) {
  if (sessionSnapshot.sourceType !== "imported") return "";

  return renderNotice({
    title: "Geimporteerde bibliotheekgegevens actief",
    message: `${sessionSnapshot.sourceFileName} is geladen als bewerkversie. Importeren publiceert niets en past het beheerbestand niet direct aan.`,
    tone: "info"
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
          <h3>Gereed voor publicatie</h3>
          <p class="studio-metric-value">${qualityReport.stats.ready}</p>
          <p class="studio-muted">Gecontroleerd in Studio; bibliotheek heeft nog geen publieke websiteweergave.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Waarschuwingen</h3>
          <p class="studio-metric-value">${qualityReport.stats.warnings}</p>
          <p class="studio-muted">Structuur, bestanden, mediaregistraties en relaties.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Bestandsmeldingen</h3>
          <p class="studio-metric-value">${qualityReport.stats.missingFiles}</p>
          <p class="studio-muted">Ontbrekende of nog niet geregistreerde bestanden.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Relatiemeldingen</h3>
          <p class="studio-metric-value">${qualityReport.stats.brokenRelations}</p>
          <p class="studio-muted">Koppelingen naar content die nog niet bestaat.</p>
        </article>
      </div>
    </section>
  `;
}

export function renderLibraryList({ libraryData, supplierData, brochureData, articleData, mediaData, sessionSnapshot }) {
  const items = sortLibraryItems(getLibraryItems(libraryData));
  const counts = getLibraryCounts(libraryData);
  const qualityReport = getLibraryQualityReport(libraryData, supplierData, brochureData, articleData, mediaData);
  const suppliersById = supplierNameById(supplierData);
  const actions = `
    ${renderButton({ label: "Nieuw bibliotheekitem", href: "#/bibliotheek/nieuw", variant: "primary" })}
    ${renderButton({ label: "Gegevens importeren", href: "#/bibliotheek/import", variant: "secondary" })}
    ${renderButton({ label: "Gegevens exporteren", href: "#/bibliotheek/export", variant: "secondary" })}
  `;

  return `
    ${renderPageHeader({
      eyebrow: "Bibliotheekbeheer",
      title: "Bibliotheek",
      description: "Beheer documenten en bronnen, controleer bestanden en houd de gegevens klaar voor latere websitekoppeling."
    })}

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "library.json",
      sourceDescription:
        "Wijzigingen blijven alleen in de bewerkversie totdat je bibliotheekgegevens exporteert.",
      exportMessage:
        "De gegevens zijn gedownload. Draag het beheerbestand handmatig over en gebruik daarna Website bijwerken.",
      statusText: renderSessionStatus,
      restoreLabel: "Bewerkversie herstellen",
      restoreAttributes: { "data-library-restore": true }
    })}

    ${renderImportNotice(sessionSnapshot)}
    ${renderExportNotice(sessionSnapshot)}

    ${renderNotice({
      title: "Bewerkversie",
      message:
        libraryData.storage?.message ||
        "Wijzigingen blijven in de bewerkversie. Gebruik Gegevens exporteren om het beheerbestand over te dragen.",
      tone: "warning"
    })}

    ${renderWorkflowPanel({
      nextStep: "Let op: bibliotheekitems hebben nog geen publieke websiteweergave. Exporteren draagt alleen het beheerbestand over."
    })}

    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport bibliotheek"
    })}

    ${renderValidationReport({
      valid: qualityReport.valid,
      errors: qualityReport.errors,
      warnings: qualityReport.warnings,
      sourceFileName: "actieve bewerkversie"
    }, {
      title: "Kwaliteitsrapport bibliotheek"
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-3">
        <article class="studio-card studio-metric-card">
          <h3>Totaal</h3>
          <p class="studio-metric-value">${counts.total}</p>
          <p class="studio-muted">In de bewerkversie geladen.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Gereed voor publicatie</h3>
          <p class="studio-metric-value">${counts.statuses.ready || 0}</p>
          <p class="studio-muted">Contentstatus; Website bijwerken blijft handmatig.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Gearchiveerd</h3>
          <p class="studio-metric-value">${counts.statuses.archived || 0}</p>
          <p class="studio-muted">Niet bedoeld voor publieke weergave.</p>
        </article>
      </div>
    </section>

    ${renderQualitySummary(qualityReport)}

    ${renderFilterToolbar({
      scope: "library",
      ariaLabel: "Bibliotheekfilters",
      searchPlaceholder: "Zoek op titel, URL-naam of samenvatting",
      filters: [
        { name: "status", label: "Status", options: statusOptions(libraryData) },
        { name: "type", label: "Type", options: typeOptions(libraryData) },
        { name: "category", label: "Categorie", options: categoryOptions(libraryData) }
      ],
      actions
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-2" data-library-card-list>${renderLibraryCards(items, libraryData, suppliersById)}</div>
      <div class="studio-list-empty" data-library-empty hidden>
        Geen bibliotheekitems gevonden met deze zoekterm of filters.
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Tabelweergave</h2>
      </div>
      ${renderLibraryTable(items, libraryData, suppliersById)}
    </section>
  `;
}

export function setupLibraryList({ librarySession, rerender, restoreDraft }) {
  const search = document.querySelector("[data-library-search]");
  const clearSearch = document.querySelector("[data-library-search-clear]");
  const filters = Array.from(document.querySelectorAll("[data-library-filter]"));
  const items = Array.from(document.querySelectorAll("[data-library-item]"));
  const empty = document.querySelector("[data-library-empty]");
  const restoreButton = document.querySelector("[data-library-restore]");

  function applyFilters() {
    const query = search?.value || "";
    const values = readFilterValues(filters, "library");
    let visibleCount = 0;

    items.forEach((item) => {
      const hasSearchMatch = matchesSearch(item, query);
      const matchesStatus = values.status === "all" || item.dataset.status === values.status;
      const matchesType = values.type === "all" || item.dataset.type === values.type;
      const matchesCategory = values.category === "all" || item.dataset.category === values.category;
      const visible = hasSearchMatch && matchesStatus && matchesType && matchesCategory;
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (empty) {
      empty.hidden = visibleCount > 0;
    }
  }

  setupSearchInput({ search, clearButton: clearSearch, onChange: applyFilters });
  filters.forEach((filter) => filter.addEventListener("change", applyFilters));
  restoreButton?.addEventListener("click", async () => {
    if (librarySession.snapshot().dirty) {
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
      librarySession.restoreSource();
    }
    rerender();
  });

  applyFilters();
}
