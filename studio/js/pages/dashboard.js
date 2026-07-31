import { renderButton } from "../../../components/button.js";
import { renderMetricCard, renderPanelCard } from "../../../components/card.js";
import { renderEmptyState } from "../../../components/empty-state.js";
import { renderPageHeader } from "../../../components/page-header.js";
import { renderStatusBadge } from "../../../components/status-badge.js";
import { getArticleCounts } from "../../../shared/article-model.js";
import { getBrochureCounts } from "../../../shared/brochure-model.js";
import { getMediaCounts } from "../../../shared/media-model.js";
import { getSupplierCounts } from "../../../shared/supplier-model.js";
import { escapeHtml } from "../../../shared/utils.js";
import { renderNotFoundState } from "../shared/not-found.js";

function hydrateMetrics(dashboardData, supplierData, brochureData, mediaData, articleData) {
  const supplierCounts = getSupplierCounts(supplierData);
  const brochureCounts = getBrochureCounts(brochureData);
  const mediaCounts = getMediaCounts(mediaData);
  const articleCounts = getArticleCounts(articleData);
  return dashboardData.metrics.map((metric) => {
    if (metric.id === "suppliers") {
      return {
        ...metric,
        value: supplierCounts.total,
        state: "foundation",
        note: "Gelezen uit de actieve Studio-werksessie; nog niet gekoppeld aan de publieke website."
      };
    }

    if (metric.id === "brochures") {
      return {
        ...metric,
        value: brochureCounts.total,
        state: "foundation",
        note: "Gelezen uit de actieve brochurewerksessie; nog niet gekoppeld aan de publieke website."
      };
    }

    if (metric.id === "media") {
      return {
        ...metric,
        value: mediaCounts.total,
        state: "foundation",
        note: "Gelezen uit het mediaregister; uploads en automatische bestandsplaatsing zijn niet actief."
      };
    }

    if (metric.id === "articles") {
      return {
        ...metric,
        value: articleCounts.total,
        state: "foundation",
        note: "Gelezen uit de actieve kennisbankwerksessie; nog niet gekoppeld aan de publieke website."
      };
    }

    return metric;
  });
}

function renderQuickAction(action) {
  const href = action.enabled ? action.route : "";
  return `
    <article class="studio-card">
      <div class="studio-card-head">
        <h3>${escapeHtml(action.label)}</h3>
        ${renderStatusBadge(action.enabled ? "foundation" : "disabled")}
      </div>
      <p class="studio-muted">${escapeHtml(action.message)}</p>
      ${renderButton({
        label: action.enabled ? "Openen" : "Niet actief",
        href,
        variant: "secondary",
        disabled: !action.enabled
      })}
    </article>
  `;
}

export function renderDashboard(dashboardData, supplierData, brochureData, mediaData, articleData) {
  const metrics = hydrateMetrics(dashboardData, supplierData, brochureData, mediaData, articleData).map(renderMetricCard).join("");
  const panels = dashboardData.panels.map(renderPanelCard).join("");
  const quickActions = dashboardData.quickActions.map(renderQuickAction).join("");

  return `
    ${renderPageHeader({
      eyebrow: "Studio fundament",
      title: "Dashboard",
      description: dashboardData.summary
    })}

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Statusoverzicht</h2>
        ${renderStatusBadge(dashboardData.status)}
      </div>
      <div class="studio-grid studio-grid-4">${metrics}</div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Werkstatus</h2>
      </div>
      <div class="studio-grid studio-grid-3">${panels}</div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Snelle acties</h2>
      </div>
      <div class="studio-grid studio-grid-3">${quickActions}</div>
    </section>
  `;
}

export function renderRoutePlaceholder(route) {
  return renderEmptyState({
    title: `${route.title} is nog niet actief`,
    message:
      "Deze route is bewust als placeholder opgenomen. Beheer voor dit onderdeel wordt pas in een latere sprint gebouwd.",
    label: "Placeholder",
    actions: renderButton({ label: "Terug naar dashboard", href: "#/dashboard", variant: "secondary" })
  });
}

export function renderRouteNotFound(route) {
  const requestedPath = route.params?.requestedPath || route.path || "onbekende route";
  return renderNotFoundState({
    title: "Pagina niet gevonden",
    message: `De Studio-route ${requestedPath} bestaat niet of is niet beschikbaar in deze sprint.`,
    label: "Niet gevonden",
    backHref: "#/dashboard",
    backLabel: "Terug naar dashboard"
  });
}
