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
  getLibraryCounts,
  getLibraryItems,
  getLibraryStatusLabel,
  getLibraryTypeLabel,
  sortLibraryItems
} from "../../../../shared/library-model.js";
import { getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

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
  if (snapshot.dirty) return "Niet-opgeslagen bibliotheekwijzigingen";
  return "Gelijk aan geladen bron";
}

export function renderLibraryList({ libraryData, supplierData, sessionSnapshot }) {
  const items = sortLibraryItems(getLibraryItems(libraryData));
  const counts = getLibraryCounts(libraryData);
  const suppliersById = supplierNameById(supplierData);
  const actions = renderButton({ label: "Nieuw bibliotheekitem", href: "#/bibliotheek/nieuw", variant: "primary" });

  return `
    ${renderPageHeader({
      eyebrow: "Bibliotheekbeheer",
      title: "Bibliotheek",
      description: "Registreer documenten en bronnen als Studio-register binnen de statische browserwerksessie."
    })}

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "library.json",
      sourceDescription:
        "Wijzigingen bestaan alleen in browsergeheugen. Import, export, uploads en automatische downloads zijn in Sprint 9A niet actief.",
      statusText: renderSessionStatus,
      restoreLabel: "Bibliotheeksessie herstellen",
      restoreAttributes: { "data-library-restore": true }
    })}

    ${renderNotice({
      title: "Register zonder upload",
      message:
        libraryData.storage?.message ||
        "Bibliotheekitems worden alleen als metadata geregistreerd. Studio uploadt, verplaatst of publiceert geen bestanden.",
      tone: "warning"
    })}

    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport bibliotheek"
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-3">
        <article class="studio-card studio-metric-card">
          <h3>Totaal</h3>
          <p class="studio-metric-value">${counts.total}</p>
          <p class="studio-muted">Geregistreerde bibliotheekitems in de actieve werksessie.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Ter controle</h3>
          <p class="studio-metric-value">${counts.statuses.review || 0}</p>
          <p class="studio-muted">Contentstatus; publiceert niets automatisch.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Bestandspad ontbreekt</h3>
          <p class="studio-metric-value">${counts.missingFilePath}</p>
          <p class="studio-muted">Items zonder gekoppeld bestandspad.</p>
        </article>
      </div>
    </section>

    ${renderFilterToolbar({
      scope: "library",
      ariaLabel: "Bibliotheekfilters",
      searchPlaceholder: "Zoek op titel, slug of samenvatting",
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
        Geen bibliotheekitems gevonden met deze filters.
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

export function setupLibraryList({ librarySession, rerender }) {
  const search = document.querySelector("[data-library-search]");
  const filters = Array.from(document.querySelectorAll("[data-library-filter]"));
  const items = Array.from(document.querySelectorAll("[data-library-item]"));
  const empty = document.querySelector("[data-library-empty]");
  const restoreButton = document.querySelector("[data-library-restore]");

  function applyFilters() {
    const query = search?.value.trim().toLowerCase() || "";
    const values = Object.fromEntries(filters.map((filter) => [filter.dataset.libraryFilter, filter.value]));
    let visibleCount = 0;

    items.forEach((item) => {
      const matchesSearch = !query || (item.dataset.title || "").includes(query);
      const matchesStatus = values.status === "all" || item.dataset.status === values.status;
      const matchesType = values.type === "all" || item.dataset.type === values.type;
      const matchesCategory = values.category === "all" || item.dataset.category === values.category;
      const visible = matchesSearch && matchesStatus && matchesType && matchesCategory;
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
    if (librarySession.snapshot().dirty) {
      const confirmed = await confirmStudioAction({
        title: "Bibliotheeksessie herstellen?",
        message:
          "De actieve bibliotheekwerksessie wijkt af van de geladen bron. Als je doorgaat, worden deze werksessiewijzigingen verworpen.",
        confirmLabel: "Sessie herstellen",
        cancelLabel: "Annuleren",
        tone: "warning"
      });
      if (!confirmed) return;
    }

    librarySession.restoreSource();
    rerender();
  });

  applyFilters();
}
