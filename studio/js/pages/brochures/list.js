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
  getBrochureCounts,
  getBrochureLanguageLabel,
  getBrochureStatusLabel,
  getBrochures,
  sortBrochures
} from "../../../../shared/brochure-model.js";
import { getSuppliers, sortSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { setupBrochureImportExport } from "./import-export.js";

function supplierNameById(supplierData) {
  return new Map(getSuppliers(supplierData).map((supplier) => [supplier.id, supplier.name]));
}

function renderBrochureActions(brochure) {
  return `
    <div class="studio-actions">
      ${renderButton({
        label: "Bekijken",
        href: `#/brochures/${brochure.slug}`,
        variant: "secondary",
        ariaLabel: `${brochure.title} bekijken`
      })}
      ${renderButton({
        label: "Bewerken",
        href: `#/brochures/${brochure.slug}/bewerken`,
        variant: "outline",
        ariaLabel: `${brochure.title} bewerken`
      })}
    </div>
  `;
}

function renderBrochureCards(brochures, suppliersById) {
  return brochures
    .map((brochure) => {
      const supplierName = suppliersById.get(brochure.supplierId) || "Onbekende leverancier";
      return `
        <article
          class="studio-card studio-brochure-card"
          data-brochure-item
          data-title="${escapeHtml(`${brochure.title} ${brochure.slug}`.toLowerCase())}"
          data-status="${escapeHtml(brochure.status)}"
          data-supplier="${escapeHtml(brochure.supplierId)}"
          data-year="${escapeHtml(String(brochure.year || ""))}"
          data-categories="${escapeHtml((brochure.categories || []).join(" ").toLowerCase())}"
        >
          <div class="studio-card-head">
            <div>
              <h3>${escapeHtml(brochure.title)}</h3>
              <p class="studio-muted">${escapeHtml(supplierName)}</p>
            </div>
            ${renderStatusBadge(brochure.status, getBrochureStatusLabel(brochure.status))}
          </div>
          <p>${escapeHtml(brochure.description || "Geen beschrijving ingevuld.")}</p>
          <p class="studio-meta">${escapeHtml((brochure.categories || []).join(", ") || "Geen categorieen")}</p>
          <p class="studio-meta">${escapeHtml(brochure.year ? String(brochure.year) : "Geen jaar")} · ${escapeHtml(getBrochureLanguageLabel(brochure.language))}</p>
          ${renderBrochureActions(brochure)}
        </article>
      `;
    })
    .join("");
}

function renderBrochureTable(brochures, suppliersById) {
  return renderDataTable({
    label: "Brochureoverzicht",
    rows: brochures,
    rowAttributes: (brochure) => `
      data-brochure-item
      data-title="${escapeHtml(`${brochure.title} ${brochure.slug}`.toLowerCase())}"
      data-status="${escapeHtml(brochure.status)}"
      data-supplier="${escapeHtml(brochure.supplierId)}"
      data-year="${escapeHtml(String(brochure.year || ""))}"
      data-categories="${escapeHtml((brochure.categories || []).join(" ").toLowerCase())}"
    `,
    columns: [
      {
        label: "Titel",
        render: (brochure) => `<strong>${escapeHtml(brochure.title)}</strong><br><span>${escapeHtml(brochure.slug)}</span>`
      },
      {
        label: "Leverancier",
        render: (brochure) => escapeHtml(suppliersById.get(brochure.supplierId) || "Onbekende leverancier")
      },
      {
        label: "Jaar",
        render: (brochure) => escapeHtml(brochure.year ? String(brochure.year) : "Geen jaar")
      },
      {
        label: "Status",
        render: (brochure) => renderStatusBadge(brochure.status, getBrochureStatusLabel(brochure.status))
      },
      {
        label: "Acties",
        render: renderBrochureActions
      }
    ]
  });
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
      "De gegevens zijn gedownload. Vervang het beheerbestand, plaats PDF en afbeelding waar nodig en voer daarna npm run generate:public uit voor Website bijwerken.",
    tone: "success"
  });
}

function renderImportNotice(sessionSnapshot) {
  if (sessionSnapshot.sourceType !== "imported") return "";

  return renderNotice({
    title: "Geimporteerde brochuregegevens actief",
    message: `${sessionSnapshot.sourceFileName} is geladen als bewerkversie. Importeren publiceert niets en past het beheerbestand niet direct aan.`,
    tone: "info"
  });
}

function renderImportSummary(report) {
  if (report?.action !== "import" || typeof report.itemCount !== "number") return "";

  return renderNotice({
    title: report.valid ? "Brochurebestand gevalideerd" : "Brochurebestand niet geaccepteerd",
    message: `${report.sourceFileName || "Het geselecteerde bestand"} bevat ${report.itemCount} brochures. Controleer het validatierapport hieronder.`,
    tone: report.valid ? "info" : "warning"
  });
}

export function renderBrochuresList({ brochureData, supplierData, sessionSnapshot }) {
  const brochures = sortBrochures(getBrochures(brochureData));
  const counts = getBrochureCounts(brochureData);
  const suppliersById = supplierNameById(supplierData);
  const supplierOptions = [
    { value: "all", label: "Alle leveranciers" },
    ...sortSuppliers(getSuppliers(supplierData)).map((supplier) => ({ value: supplier.id, label: supplier.name }))
  ];
  const statusOptions = [
    { value: "all", label: "Alle statussen" },
    ...(brochureData.statuses || []).map((status) => ({ value: status, label: getBrochureStatusLabel(status) }))
  ];
  const yearOptions = [
    { value: "all", label: "Alle jaren" },
    ...[...new Set(brochures.map((brochure) => brochure.year).filter(Boolean))]
      .sort((first, second) => Number(second) - Number(first))
      .map((year) => ({ value: String(year), label: String(year) }))
  ];

  const actions = `
    ${renderButton({ label: "Nieuwe brochure", href: "#/brochures/nieuw", variant: "primary" })}
    ${renderButton({
      label: "Gegevens importeren",
      variant: "secondary",
      ariaLabel: "Brochuregegevens importeren",
      attributes: { "data-brochure-import-button": true }
    })}
    ${renderButton({
      label: "Gegevens exporteren",
      variant: "secondary",
      ariaLabel: "Brochuregegevens exporteren",
      attributes: { "data-brochure-export-button": true }
    })}
    ${renderFileInput({
      id: "brochure-import-file",
      accept: ".json",
      label: "brochures.json importeren",
      attributes: { "data-brochure-import-file": true }
    })}
  `;

  return `
    ${renderPageHeader({
      eyebrow: "Brochurebeheer",
      title: "Brochures",
      description: "Beheer brochures, controleer PDF en afbeelding en zet complete gegevens klaar voor de publieke website."
    })}

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "brochures.json",
      sourceDescription:
        "Wijzigingen blijven alleen in de bewerkversie totdat je brochuregegevens exporteert.",
      exportMessage:
        "De gegevens zijn gedownload. Vervang het beheerbestand, plaats PDF en afbeelding waar nodig en voer daarna npm run generate:public uit voor Website bijwerken.",
      statusText: renderSessionStatus,
      restoreAttributes: { "data-brochure-restore": true }
    })}

    ${renderImportNotice(sessionSnapshot)}
    ${renderExportNotice(sessionSnapshot)}
    ${renderImportSummary(sessionSnapshot.lastValidationReport)}

    ${renderNotice({
      title: "Bewerkversie",
      message:
        brochureData.storage?.message ||
        "Wijzigingen blijven in de bewerkversie. Gebruik Gegevens exporteren, vervang het beheerbestand en voer daarna npm run generate:public uit voor Website bijwerken.",
      tone: "warning"
    })}

    ${renderWorkflowPanel()}

    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport brochurebestand"
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-3">
        <article class="studio-card studio-metric-card">
          <h3>Totaal</h3>
          <p class="studio-metric-value">${counts.total}</p>
          <p class="studio-muted">In de bewerkversie geladen.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Met PDF-bestand</h3>
          <p class="studio-metric-value">${counts.withPdf}</p>
          <p class="studio-muted">PDF-bestand ingevuld; aanwezigheid controleer je op de detailpagina en met checks.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Review</h3>
          <p class="studio-metric-value">${counts.statuses.review || 0}</p>
          <p class="studio-muted">Contentstatus; dit publiceert niets automatisch.</p>
        </article>
      </div>
    </section>

    ${renderFilterToolbar({
      scope: "brochure",
      ariaLabel: "Brochurefilters",
      searchPlaceholder: "Zoek op titel, URL-naam of categorie",
      filters: [
        { name: "supplier", label: "Leverancier", options: supplierOptions },
        { name: "status", label: "Status", options: statusOptions },
        { name: "year", label: "Jaar", options: yearOptions }
      ],
      actions
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-2" data-brochure-card-list>${renderBrochureCards(brochures, suppliersById)}</div>
      <div class="studio-list-empty" data-brochure-empty hidden>
        Geen brochures gevonden met deze filters.
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Tabelweergave</h2>
      </div>
      ${renderBrochureTable(brochures, suppliersById)}
    </section>
  `;
}

export function setupBrochureList({ brochureSession, supplierSession, rerender, restoreDraft }) {
  const search = document.querySelector("[data-brochure-search]");
  const filters = Array.from(document.querySelectorAll("[data-brochure-filter]"));
  const items = Array.from(document.querySelectorAll("[data-brochure-item]"));
  const empty = document.querySelector("[data-brochure-empty]");
  const restoreButton = document.querySelector("[data-brochure-restore]");

  setupBrochureImportExport({ brochureSession, supplierSession, rerender });

  function applyFilters() {
    const query = search?.value.trim().toLowerCase() || "";
    const values = Object.fromEntries(filters.map((filter) => [filter.dataset.brochureFilter, filter.value]));
    let visibleCount = 0;

    items.forEach((item) => {
      const haystack = `${item.dataset.title || ""} ${item.dataset.categories || ""}`;
      const matchesSearch = !query || haystack.includes(query);
      const matchesSupplier = values.supplier === "all" || item.dataset.supplier === values.supplier;
      const matchesStatus = values.status === "all" || item.dataset.status === values.status;
      const matchesYear = values.year === "all" || item.dataset.year === values.year;
      const visible = matchesSearch && matchesSupplier && matchesStatus && matchesYear;
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
    if (brochureSession.snapshot().dirty) {
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
      brochureSession.restoreSource();
    }
    rerender();
  });
}
