import { renderButton } from "../../../components/button.js";
import { renderMetricCard, renderPanelCard } from "../../../components/card.js";
import { renderEmptyState } from "../../../components/empty-state.js";
import { renderPageHeader } from "../../../components/page-header.js";
import { renderStatusBadge } from "../../../components/status-badge.js";
import { getArticleCounts } from "../../../shared/article-model.js";
import { getArticleQualityReport } from "../../../shared/article-quality.js";
import { getBrochureCounts } from "../../../shared/brochure-model.js";
import { getContentGovernanceReport } from "../../../shared/content-governance.js";
import { CONTENT_READINESS_LABELS, getContentReadinessReport } from "../../../shared/content-readiness.js";
import { getContentRelationStats } from "../../../shared/content-relations.js";
import { getLibraryCounts } from "../../../shared/library-model.js";
import { getLibraryQualityReport } from "../../../shared/library-quality.js";
import { getMediaCounts } from "../../../shared/media-model.js";
import { getSupplierCounts } from "../../../shared/supplier-model.js";
import { escapeHtml } from "../../../shared/utils.js";
import { renderNotFoundState } from "../shared/not-found.js";

const PUBLIC_DEMO_MODULE_IDS = ["articles", "suppliers", "brochures"];

function hydrateMetrics(dashboardData, supplierData, brochureData, mediaData, articleData, libraryData) {
  const supplierCounts = getSupplierCounts(supplierData);
  const brochureCounts = getBrochureCounts(brochureData);
  const mediaCounts = getMediaCounts(mediaData);
  const articleCounts = getArticleCounts(articleData);
  const libraryCounts = getLibraryCounts(libraryData);
  const articleQuality = getArticleQualityReport(articleData, supplierData, brochureData, mediaData);
  const libraryQuality = getLibraryQualityReport(libraryData, supplierData, brochureData, articleData, mediaData);
  const relationStats = getContentRelationStats(supplierData, brochureData, mediaData, articleData);
  const governanceReport = getContentGovernanceReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData,
    library: libraryData
  });
  return dashboardData.metrics.map((metric) => {
    if (metric.id === "suppliers") {
      return {
        ...metric,
        value: supplierCounts.total,
        state: "foundation",
        note: "Gelezen uit de bewerkversie; de website gebruikt gecontroleerde publieke gegevens."
      };
    }

    if (metric.id === "brochures") {
      return {
        ...metric,
        value: brochureCounts.total,
        state: "foundation",
        note: "Gelezen uit de bewerkversie; de website gebruikt gecontroleerde publieke gegevens."
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
        note: "Gelezen uit de bewerkversie van de kennisbank; de website gebruikt gecontroleerde publieke gegevens."
      };
    }

    if (metric.id === "library") {
      return {
        ...metric,
        value: libraryCounts.total,
        state: "foundation",
        note: "Gelezen uit de bewerkversie van de bibliotheek; nog geen websiteweergave actief."
      };
    }

    if (metric.id === "libraryMissingFiles") {
      return {
        ...metric,
        value: libraryQuality.stats.missingFiles,
        state: libraryQuality.stats.missingFiles ? "review" : "foundation",
        note: "Bibliotheekitems met ontbrekende of nog niet geregistreerde bestanden en afbeeldingen."
      };
    }

    if (metric.id === "libraryPublished") {
      return {
        ...metric,
        value: libraryQuality.stats.published,
        state: "foundation",
        note: "Gelezen uit de bewerkversie van de bibliotheek; Website bijwerken blijft de handmatige stap."
      };
    }

    if (metric.id === "libraryWarnings") {
      return {
        ...metric,
        value: libraryQuality.stats.warnings,
        state: libraryQuality.stats.warnings ? "review" : "foundation",
        note: "Waarschuwingen uit het bibliotheekkwaliteitsrapport."
      };
    }

    if (metric.id === "articlePublished") {
      return {
        ...metric,
        value: articleQuality.stats.published,
        state: "foundation",
        note: "Gelezen uit de bewerkversie van de kennisbank; Website bijwerken blijft de handmatige stap."
      };
    }

    if (metric.id === "articleWarnings") {
      return {
        ...metric,
        value: articleQuality.stats.warnings,
        state: articleQuality.stats.warnings ? "review" : "foundation",
        note: "Waarschuwingen uit het kennisbankkwaliteitsrapport."
      };
    }

    if (metric.id === "articleMissingMedia") {
      return {
        ...metric,
        value: articleQuality.stats.missingMediaRegistrations,
        state: articleQuality.stats.missingMediaRegistrations ? "review" : "foundation",
        note: "Headerafbeeldingen die nog niet in Media staan."
      };
    }

    if (metric.id === "articlesWithoutSupplier") {
      return {
        ...metric,
        value: relationStats.articlesWithoutSupplier,
        state: relationStats.articlesWithoutSupplier ? "review" : "foundation",
        note: "Kennisbankartikelen zonder gekoppelde leverancier."
      };
    }

    if (metric.id === "suppliersWithoutBrochures") {
      return {
        ...metric,
        value: relationStats.suppliersWithoutBrochures,
        state: relationStats.suppliersWithoutBrochures ? "review" : "foundation",
        note: "Leveranciers zonder brochurekoppeling of brochure met supplierId."
      };
    }

    if (metric.id === "mediaWithoutUsage") {
      return {
        ...metric,
        value: relationStats.mediaWithoutUsage,
        state: relationStats.mediaWithoutUsage ? "review" : "foundation",
        note: "Mediabestanden zonder gebruik in leveranciers, brochures of artikelen."
      };
    }

    if (metric.id === "governanceAttention") {
      const value = governanceReport.totals.issueCount;
      return {
        ...metric,
        value,
        state: value ? "review" : "foundation",
        note: "Actiegerichte issues uit het read-only governance-overzicht."
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

function renderDashboardMetric({ label, value, note, state = "foundation", badgeLabel = "" }) {
  return `
    <article class="studio-card studio-metric-card">
      <div class="studio-card-head">
        <h3>${escapeHtml(label)}</h3>
        ${renderStatusBadge(state, badgeLabel || CONTENT_READINESS_LABELS[state])}
      </div>
      <p class="studio-metric-value">${Number(value || 0)}</p>
      <p class="studio-muted">${escapeHtml(note)}</p>
    </article>
  `;
}

function publicDashboardState(readinessReport) {
  if (readinessReport.totals.needs_attention) return "review";
  if (readinessReport.totals.publication.review) return "warning";
  return "ready";
}

function publicModuleLabel(moduleId) {
  if (moduleId === "articles") return "Kennisbankartikelen";
  if (moduleId === "suppliers") return "Leveranciers";
  if (moduleId === "brochures") return "Brochures";
  return moduleId;
}

function publicDemoModules(readinessReport) {
  return PUBLIC_DEMO_MODULE_IDS.map((moduleId) => readinessReport.modules.find((module) => module.id === moduleId)).filter(Boolean);
}

function renderPublicModuleOverview(readinessReport) {
  const modules = publicDemoModules(readinessReport);

  return `
    <article class="studio-card">
      <div class="studio-card-head">
        <div>
          <h3>Websiteonderdelen actief</h3>
          <p class="studio-muted">Aantallen uit de gecontroleerde publieke gegevens.</p>
        </div>
        ${renderStatusBadge("ready", `${modules.filter((module) => module.publication.visible).length} actief`)}
      </div>
      <dl class="studio-detail-list">
        ${modules
          .map(
            (module) => `
              <div>
                <dt>${escapeHtml(publicModuleLabel(module.id))}</dt>
                <dd>${Number(module.publication.visible || 0)} ${renderStatusBadge(module.publication.visible ? "ready" : "foundation", module.publication.visible ? "Zichtbaar" : "Niet zichtbaar")}</dd>
              </div>
            `
          )
          .join("")}
      </dl>
      <div class="studio-actions">
        ${renderButton({ label: "Governance openen", href: "#/governance", variant: "secondary" })}
      </div>
    </article>
  `;
}

function renderPublicationExplanation() {
  return `
    <article class="studio-card">
      <div class="studio-card-head">
        <h3>Website bijwerken</h3>
        ${renderStatusBadge("foundation")}
      </div>
      <ul class="studio-relation-list">
        <li><span>Dit staat live</span><strong>Item is zichtbaar op de website en vraagt geen extra controle.</strong></li>
        <li><span>Dit vraagt aandacht</span><strong>Item is zichtbaar, maar relatie, context of PDF-actie moet nog worden gecontroleerd.</strong></li>
        <li><span>Dit ontbreekt nog</span><strong>Readiness of governance geeft aan welke informatie eerst nodig is.</strong></li>
      </ul>
    </article>
  `;
}

function renderDemoReadinessSummary(readinessReport) {
  const totals = readinessReport.totals;
  const state = publicDashboardState(readinessReport);

  return `
    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Website-overzicht</h2>
        ${renderStatusBadge(state, state === "ready" ? "Gereed voor publicatie" : "Aandachtspunten")}
      </div>
      <div class="studio-grid studio-grid-4">
        ${renderDashboardMetric({
          label: "Zichtbaar op website",
          value: totals.publication.visible,
          note: "Items die via gecontroleerde content op de website verschijnen.",
          state: totals.publication.visible ? "ready" : "foundation",
          badgeLabel: totals.publication.visible ? "Live" : "Leeg"
        })}
        ${renderDashboardMetric({
          label: "Gereed voor publicatie",
          value: totals.publication.ready,
          note: "Live items zonder extra websitefeedback.",
          state: totals.publication.ready ? "ready" : "foundation",
          badgeLabel: "Klaar"
        })}
        ${renderDashboardMetric({
          label: "Nog afronden",
          value: totals.publication.review,
          note: "Live items waar relatie, context of PDF-actie nog controle vraagt.",
          state: totals.publication.review ? "review" : "foundation",
          badgeLabel: "Aandacht"
        })}
        ${renderDashboardMetric({
          label: "Nog niet gereed",
          value: totals.needs_attention,
          note: "Contentitems waar belangrijke informatie ontbreekt volgens bestaande signalen.",
          state: totals.needs_attention ? "needs_attention" : "foundation",
          badgeLabel: "Aandacht"
        })}
      </div>
      <div class="studio-grid studio-grid-2">
        ${renderPublicModuleOverview(readinessReport)}
        ${renderPublicationExplanation()}
      </div>
    </section>
  `;
}

export function renderDashboard(dashboardData, supplierData, brochureData, mediaData, articleData, libraryData) {
  const metrics = hydrateMetrics(dashboardData, supplierData, brochureData, mediaData, articleData, libraryData).map(renderMetricCard).join("");
  const panels = dashboardData.panels.map(renderPanelCard).join("");
  const quickActions = dashboardData.quickActions.map(renderQuickAction).join("");
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData,
    library: libraryData
  });

  return `
    ${renderPageHeader({
      eyebrow: "Studio fundament",
      title: "Dashboard",
      description: dashboardData.summary
    })}

    ${renderDemoReadinessSummary(readinessReport)}

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
    message: "Deze route is nog niet actief. Gebruik het dashboard of de actieve contentmodules voor controle.",
    label: "Nog niet actief",
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
