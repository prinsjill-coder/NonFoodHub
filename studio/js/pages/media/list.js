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
  getMediaAssets,
  getMediaCounts,
  getMediaRightsStatusLabel,
  getMediaStatusLabel,
  getMediaTypeLabel,
  getMediaUsageTypeLabel,
  sortMediaAssets
} from "../../../../shared/media-model.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { createSearchText, matchesSearch, readFilterValues, setupSearchInput } from "../../shared/list-search.js";

function renderMediaActions(asset) {
  return `
    <div class="studio-actions">
      ${renderButton({
        label: "Bekijken",
        href: `#/media/${asset.id}`,
        variant: "secondary",
        ariaLabel: `${asset.title} bekijken`
      })}
      ${renderButton({
        label: "Bewerken",
        href: `#/media/${asset.id}/bewerken`,
        variant: "outline",
        ariaLabel: `${asset.title} bewerken`
      })}
    </div>
  `;
}

function renderMediaCards(mediaAssets, mediaData) {
  return mediaAssets
    .map(
      (asset) => `
        <article
          class="studio-card studio-media-card"
          data-media-item
          data-search="${escapeHtml(createSearchText(
            asset.title,
            asset.id,
            asset.file,
            asset.caption,
            asset.alt,
            getMediaTypeLabel(asset.type, mediaData),
            getMediaUsageTypeLabel(asset.usageType, mediaData),
            getMediaRightsStatusLabel(asset.rightsStatus, mediaData)
          ))}"
          data-title="${escapeHtml(`${asset.title} ${asset.id} ${asset.file}`.toLowerCase())}"
          data-type="${escapeHtml(asset.type)}"
          data-usage="${escapeHtml(asset.usageType)}"
          data-rights="${escapeHtml(asset.rightsStatus)}"
          data-status="${escapeHtml(asset.status)}"
        >
          <div class="studio-card-head">
            <div>
              <h3>${escapeHtml(asset.title)}</h3>
              <p class="studio-muted">${escapeHtml(asset.file)}</p>
            </div>
            ${renderStatusBadge(asset.status, getMediaStatusLabel(asset.status))}
          </div>
          <p>${escapeHtml(asset.caption || asset.alt || "Geen beschrijving ingevuld.")}</p>
          <p class="studio-meta">
            ${escapeHtml(getMediaTypeLabel(asset.type, mediaData))} &middot;
            ${escapeHtml(getMediaUsageTypeLabel(asset.usageType, mediaData))} &middot;
            ${escapeHtml(getMediaRightsStatusLabel(asset.rightsStatus, mediaData))}
          </p>
          ${renderMediaActions(asset)}
        </article>
      `
    )
    .join("");
}

function renderMediaTable(mediaAssets, mediaData) {
  return renderDataTable({
    label: "Mediaregister",
    rows: mediaAssets,
    rowAttributes: (asset) => `
      data-media-item
      data-search="${escapeHtml(createSearchText(
        asset.title,
        asset.id,
        asset.file,
        asset.caption,
        asset.alt,
        getMediaTypeLabel(asset.type, mediaData),
        getMediaUsageTypeLabel(asset.usageType, mediaData),
        getMediaRightsStatusLabel(asset.rightsStatus, mediaData)
      ))}"
      data-title="${escapeHtml(`${asset.title} ${asset.id} ${asset.file}`.toLowerCase())}"
      data-type="${escapeHtml(asset.type)}"
      data-usage="${escapeHtml(asset.usageType)}"
      data-rights="${escapeHtml(asset.rightsStatus)}"
      data-status="${escapeHtml(asset.status)}"
    `,
    columns: [
      {
        label: "Asset",
        render: (asset) => `<strong>${escapeHtml(asset.title)}</strong><br><span>${escapeHtml(asset.id)}</span>`
      },
      {
        label: "Bestand",
        render: (asset) => `<code>${escapeHtml(asset.file)}</code>`
      },
      {
        label: "Type",
        render: (asset) => escapeHtml(getMediaTypeLabel(asset.type, mediaData))
      },
      {
        label: "Gebruik",
        render: (asset) => escapeHtml(getMediaUsageTypeLabel(asset.usageType, mediaData))
      },
      {
        label: "Status",
        render: (asset) => renderStatusBadge(asset.status, getMediaStatusLabel(asset.status))
      },
      {
        label: "Acties",
        render: renderMediaActions
      }
    ]
  });
}

function optionList(items, firstLabel) {
  return [
    { value: "all", label: firstLabel },
    ...(items || []).map((item) => ({
      value: item.id,
      label: item.label
    }))
  ];
}

function statusOptions(mediaData) {
  return [
    { value: "all", label: "Alle statussen" },
    ...(mediaData.statuses || []).map((status) => ({ value: status, label: getMediaStatusLabel(status) }))
  ];
}

function renderSessionStatus(snapshot) {
  if (snapshot.dirty) return "Niet-opgeslagen mediawijzigingen";
  return "Gelijk aan het geladen bestand";
}

export function renderMediaList({ mediaData, sessionSnapshot }) {
  const mediaAssets = sortMediaAssets(getMediaAssets(mediaData));
  const counts = getMediaCounts(mediaData);
  const actions = renderButton({ label: "Nieuw media-asset", href: "#/media/nieuw", variant: "primary" });

  return `
    ${renderPageHeader({
      eyebrow: "Mediaregister",
      title: "Media",
      description: "Registreer bestaande bestanden en controleer beschrijvingen en rechtenstatus in de bewerkversie."
    })}

    ${renderSessionBanner(sessionSnapshot, {
      fileName: "media.json",
      sourceDescription:
        "Wijzigingen bestaan alleen in de bewerkversie. Upload, import en export voor media zijn nog niet actief.",
      statusText: renderSessionStatus,
      restoreLabel: "Media herstellen",
      restoreAttributes: { "data-media-restore": true }
    })}

    ${renderNotice({
      title: "Bestandsregistratie zonder upload",
      message:
        mediaData.storage?.message ||
        "Mediabestanden worden alleen geregistreerd. Studio uploadt, verplaatst of publiceert geen bestanden.",
      tone: "warning"
    })}

    ${renderWorkflowPanel()}

    ${renderValidationReport(sessionSnapshot.lastValidationReport, {
      title: "Validatierapport mediaregister"
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-4">
        <article class="studio-card studio-metric-card">
          <h3>Totaal</h3>
          <p class="studio-metric-value">${counts.total}</p>
          <p class="studio-muted">Geregistreerde bestanden in de bewerkversie.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Bestand ontbreekt</h3>
          <p class="studio-metric-value">${counts.missingFilePath}</p>
          <p class="studio-muted">Items zonder ingevuld bestand.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Alt-tekst ontbreekt</h3>
          <p class="studio-metric-value">${counts.missingAlt}</p>
          <p class="studio-muted">Afbeeldingsassets zonder alt-tekst.</p>
        </article>
        <article class="studio-card studio-metric-card">
          <h3>Rechtencheck</h3>
          <p class="studio-metric-value">${counts.needsRightsReview}</p>
          <p class="studio-muted">Assets met onbekende of te controleren rechten.</p>
        </article>
      </div>
    </section>

    ${renderFilterToolbar({
      scope: "media",
      ariaLabel: "Mediafilters",
      searchPlaceholder: "Zoek op titel, id of bestand",
      filters: [
        { name: "type", label: "Type", options: optionList(mediaData.types, "Alle types") },
        { name: "usage", label: "Gebruik", options: optionList(mediaData.usageTypes, "Alle toepassingen") },
        { name: "rights", label: "Rechten", options: optionList(mediaData.rightsStatuses, "Alle rechtenstatussen") },
        { name: "status", label: "Status", options: statusOptions(mediaData) }
      ],
      actions
    })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-2" data-media-card-list>${renderMediaCards(mediaAssets, mediaData)}</div>
      <div class="studio-list-empty" data-media-empty hidden>
        Geen media-assets gevonden met deze zoekterm of filters.
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Tabelweergave</h2>
      </div>
      ${renderMediaTable(mediaAssets, mediaData)}
    </section>
  `;
}

export function setupMediaList({ mediaSession, rerender, restoreDraft }) {
  const search = document.querySelector("[data-media-search]");
  const clearSearch = document.querySelector("[data-media-search-clear]");
  const filters = Array.from(document.querySelectorAll("[data-media-filter]"));
  const items = Array.from(document.querySelectorAll("[data-media-item]"));
  const empty = document.querySelector("[data-media-empty]");
  const restoreButton = document.querySelector("[data-media-restore]");

  function applyFilters() {
    const query = search?.value || "";
    const values = readFilterValues(filters, "media");
    let visibleCount = 0;

    items.forEach((item) => {
      const hasSearchMatch = matchesSearch(item, query);
      const matchesType = values.type === "all" || item.dataset.type === values.type;
      const matchesUsage = values.usage === "all" || item.dataset.usage === values.usage;
      const matchesRights = values.rights === "all" || item.dataset.rights === values.rights;
      const matchesStatus = values.status === "all" || item.dataset.status === values.status;
      const visible = hasSearchMatch && matchesType && matchesUsage && matchesRights && matchesStatus;
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
    if (mediaSession.snapshot().dirty) {
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
      mediaSession.restoreSource();
    }
    rerender();
  });

  applyFilters();
}
