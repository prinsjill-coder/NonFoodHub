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
  getSupplierCounts,
  getSupplierStatusLabel,
  getSupplierTypeLabel,
  getSuppliers,
  sortSuppliers
} from "../../../../shared/supplier-model.js";
import { displayStatusForPublicModule, displayStatusLabelForPublicModule } from "../../../../shared/publication-status.js";
import { escapeHtml } from "../../../../shared/utils.js";
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

function renderSupplierCards(suppliers, publicData = {}) {
  return suppliers
    .map((supplier) => {
      const status = renderedSupplierStatus(supplier, publicData);
      return `
      <article
        class="studio-card studio-supplier-card"
        data-supplier-item
        data-name="${escapeHtml(supplier.name.toLowerCase())}"
        data-status="${escapeHtml(status)}"
        data-type="${escapeHtml(supplier.type)}"
        data-categories="${escapeHtml((supplier.categories || []).join(" ").toLowerCase())}"
      >
        <div class="studio-card-head">
          <div>
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

function renderSupplierTable(suppliers, publicData = {}) {
  return renderDataTable({
    label: "Leveranciersoverzicht",
    rows: suppliers,
    rowAttributes: (supplier) => `
      data-supplier-item
      data-name="${escapeHtml(supplier.name.toLowerCase())}"
      data-status="${escapeHtml(renderedSupplierStatus(supplier, publicData))}"
      data-type="${escapeHtml(supplier.type)}"
      data-categories="${escapeHtml((supplier.categories || []).join(" ").toLowerCase())}"
    `,
    columns: [
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
  });
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

export function renderSuppliersList({ supplierData, publicData = {}, sessionSnapshot }) {
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
      searchPlaceholder: "Zoek op naam, URL-naam of categorie",
      filters: [
        { name: "type", label: "Type", options: typeOptions },
        { name: "status", label: "Status", options: statusOptions }
      ],
      actions
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-2" data-supplier-card-list>${renderSupplierCards(suppliers, publicData)}</div>
      <div class="studio-list-empty" data-supplier-empty hidden>
        Geen leveranciers gevonden met deze filters.
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Tabelweergave</h2>
      </div>
      ${renderSupplierTable(suppliers, publicData)}
    </section>
  `;
}

export function setupSupplierList({ supplierSession, rerender, restoreDraft }) {
  const search = document.querySelector("[data-supplier-search]");
  const filters = Array.from(document.querySelectorAll("[data-supplier-filter]"));
  const items = Array.from(document.querySelectorAll("[data-supplier-item]"));
  const empty = document.querySelector("[data-supplier-empty]");

  setupSupplierImportExport({ supplierSession, rerender, restoreDraft });

  function applyFilters() {
    const query = search?.value.trim().toLowerCase() || "";
    const values = Object.fromEntries(filters.map((filter) => [filter.dataset.supplierFilter, filter.value]));
    let visibleCount = 0;

    items.forEach((item) => {
      const haystack = `${item.dataset.name || ""} ${item.dataset.categories || ""}`;
      const matchesSearch = !query || haystack.includes(query);
      const matchesType = values.type === "all" || item.dataset.type === values.type;
      const matchesStatus = values.status === "all" || item.dataset.status === values.status;
      const visible = matchesSearch && matchesType && matchesStatus;
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (empty) {
      empty.hidden = visibleCount > 0;
    }
  }

  search?.addEventListener("input", applyFilters);
  filters.forEach((filter) => filter.addEventListener("change", applyFilters));
}
