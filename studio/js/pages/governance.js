import { renderButton } from "../../../components/button.js";
import { renderNotice } from "../../../components/notice.js";
import { renderPageHeader } from "../../../components/page-header.js";
import { renderStatusBadge } from "../../../components/status-badge.js";
import { getContentGovernanceReport } from "../../../shared/content-governance.js";
import { CONTENT_READINESS_LABELS, getContentReadinessReport } from "../../../shared/content-readiness.js";
import { escapeHtml } from "../../../shared/utils.js";

const SEVERITY_FILTERS = [
  { value: "all", label: "Alle issues" },
  { value: "warning", label: "Alleen waarschuwingen" },
  { value: "error", label: "Alleen fouten" }
];

function renderOverviewMetric({ label, value, note, state = "foundation" }) {
  return `
    <article class="studio-card studio-metric-card">
      <div class="studio-card-head">
        <h3>${escapeHtml(label)}</h3>
        ${renderStatusBadge(state, CONTENT_READINESS_LABELS[state])}
      </div>
      <p class="studio-metric-value">${Number(value || 0)}</p>
      <p class="studio-muted">${escapeHtml(note)}</p>
    </article>
  `;
}

function renderStatusDistribution(module) {
  const statuses = [
    ["concept", "Concept", module.concept],
    ["ready", "Gereed voor publicatie", module.ready],
    ["published", "Gepubliceerd", module.published],
    ["archived", "Gearchiveerd", module.archived]
  ];

  return `
    <dl class="studio-detail-list">
      ${statuses
        .map(([status, label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${Number(value || 0)} ${renderStatusBadge(status)}</dd>
          </div>
        `)
        .join("")}
    </dl>
  `;
}

function renderSignals(module) {
  if (!module.signals.length) {
    return `<p class="studio-muted">Geen aanvullende governance-signalen voor deze module.</p>`;
  }

  return `
    <ul class="studio-relation-list">
      ${module.signals
        .map((signal) => `
          <li>
            <span>${escapeHtml(signal.label)}</span>
            <strong>${Number(signal.value || 0)}</strong>
            ${renderStatusBadge(signal.state)}
          </li>
        `)
        .join("")}
    </ul>
  `;
}

function readinessSummaryState(totals) {
  if (totals.needs_attention) return "needs_attention";
  if (totals.review) return "review";
  return "ready";
}

function severityLabel(severity) {
  return severity === "error" ? "Fout" : "Waarschuwing";
}

function severityState(severity) {
  return severity === "error" ? "error" : "warning";
}

function issueCountLabel(count) {
  return `${Number(count || 0)} ${Number(count || 0) === 1 ? "issue" : "issues"}`;
}

function renderSeverityFilters() {
  return `
    <fieldset class="studio-fieldset studio-governance-filter-group">
      <legend>Ernst</legend>
      <div class="studio-check-grid">
        ${SEVERITY_FILTERS.map(
          (filter) => `
            <label class="studio-check-pill">
              <input
                type="radio"
                name="severity"
                value="${escapeHtml(filter.value)}"
                ${filter.value === "all" ? "checked" : ""}
                data-governance-filter-control
              >
              <span>${escapeHtml(filter.label)}</span>
            </label>
          `
        ).join("")}
      </div>
    </fieldset>
  `;
}

function renderModuleFilter(modules) {
  return `
    <label class="studio-field studio-governance-module-filter">
      <span>Module</span>
      <select name="module" data-governance-filter-control>
        <option value="all">Alle modules</option>
        ${modules
          .map((module) => `<option value="${escapeHtml(module.id)}">${escapeHtml(module.label)}</option>`)
          .join("")}
      </select>
    </label>
  `;
}

function renderIssueFilters(modules) {
  return `
    <article class="studio-card studio-governance-filters">
      <form class="studio-governance-filter-form" data-governance-filters>
        ${renderSeverityFilters()}
        ${renderModuleFilter(modules)}
      </form>
      <div class="studio-active-filters" data-governance-active-filters aria-live="polite">
        <span data-governance-active-severity>Alle issues</span>
        <span data-governance-active-module>Alle modules</span>
      </div>
    </article>
  `;
}

function renderIssueRow(issue) {
  return `
    <article
      class="studio-issue-row"
      data-governance-issue
      data-module="${escapeHtml(issue.module)}"
      data-severity="${escapeHtml(issue.severity)}"
    >
      <div class="studio-issue-main">
        <div class="studio-issue-meta">
          ${renderStatusBadge(severityState(issue.severity), severityLabel(issue.severity))}
        </div>
        <p>${escapeHtml(issue.message)}</p>
      </div>
      <div class="studio-issue-action">
        ${renderButton({
          label: "Openen",
          href: issue.targetRoute,
          variant: "secondary",
          ariaLabel: `${severityLabel(issue.severity)} openen: ${issue.message}`
        })}
      </div>
    </article>
  `;
}

function issueGroups(modules, issues) {
  return modules
    .map((module) => ({
      module,
      issues: issues.filter((issue) => issue.module === module.id)
    }))
    .filter((group) => group.issues.length);
}

function renderIssueGroup(group) {
  return `
    <section class="studio-issue-group" data-governance-issue-group data-module="${escapeHtml(group.module.id)}">
      <div class="studio-issue-group-head">
        <h3>${escapeHtml(group.module.label)}</h3>
        <span class="studio-muted" data-governance-group-count>${escapeHtml(issueCountLabel(group.issues.length))}</span>
      </div>
      <div class="studio-issue-list">
        ${group.issues.map(renderIssueRow).join("")}
      </div>
    </section>
  `;
}

function renderIssueOverview(modules, issues) {
  if (!issues.length) {
    return `
      <article class="studio-card">
        <h3>Geen issues gevonden</h3>
        <p class="studio-muted">De bestaande governance-signalen bevatten geen fouten of waarschuwingen.</p>
      </article>
    `;
  }

  return `
    <div class="studio-issue-groups" data-governance-issue-groups>
      ${issueGroups(modules, issues).map(renderIssueGroup).join("")}
    </div>
    <article class="studio-list-empty studio-issue-empty" data-governance-issue-empty hidden>
      Geen issues zichtbaar met deze filters.
    </article>
  `;
}

function renderModuleCard(module, readinessModule) {
  const state = readinessModule?.needs_attention ? "needs_attention" : readinessModule?.review ? "review" : "ready";
  const readiness = readinessModule || {
    total: module.total,
    ready: 0,
    review: 0,
    needs_attention: 0
  };

  return `
    <article class="studio-card">
      <div class="studio-card-head">
        <div>
          <h3>${escapeHtml(module.label)}</h3>
          <p class="studio-muted">Read-only samenvatting uit de bewerkversie.</p>
        </div>
        ${renderStatusBadge(state, CONTENT_READINESS_LABELS[state])}
      </div>

      <div class="studio-grid studio-grid-4">
        ${renderOverviewMetric({
          label: "Items",
          value: readiness.total,
          note: "Geregistreerde items.",
          state: "foundation"
        })}
        ${renderOverviewMetric({
          label: "Klaar",
          value: readiness.ready,
          note: "Geen belangrijke governance-issues.",
          state: readiness.ready ? "ready" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Nog afronden",
          value: readiness.review,
          note: "Bruikbaar, maar nog enkele punten afronden.",
          state: readiness.review ? "review" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Nog niet gereed",
          value: readiness.needs_attention,
          note: "Belangrijke informatie ontbreekt.",
          state: readiness.needs_attention ? "needs_attention" : "foundation"
        })}
      </div>

      <div class="studio-grid studio-grid-3">
        <section>
          <h4>Statusverdeling</h4>
          ${renderStatusDistribution(module)}
        </section>
        <section>
          <h4>Governance-signalen</h4>
          ${renderSignals(module)}
        </section>
        ${renderModulePublication(readinessModule)}
      </div>

      <div class="studio-actions">
        ${renderButton({
          label: `${module.label} openen`,
          href: module.route,
          variant: "secondary"
        })}
      </div>
    </article>
  `;
}

function renderReadinessSummary(totals) {
  const state = readinessSummaryState(totals);

  return `
    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Klaar voor de website?</h2>
        ${renderStatusBadge(state, CONTENT_READINESS_LABELS[state])}
      </div>
      <div class="studio-grid studio-grid-3">
        ${renderOverviewMetric({
          label: "Klaar",
          value: totals.ready,
          note: "Items zonder belangrijke governance-issues.",
          state: totals.ready ? "ready" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Nog afronden",
          value: totals.review,
          note: "Items die bruikbaar zijn, maar nog enkele punten vragen.",
          state: totals.review ? "review" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Nog niet gereed",
          value: totals.needs_attention,
          note: "Items waar belangrijke informatie ontbreekt.",
          state: totals.needs_attention ? "needs_attention" : "foundation"
        })}
      </div>
    </section>
  `;
}

function publicationSummaryState(publication = {}) {
  if (publication.not_public) return "review";
  if (publication.review) return "warning";
  return "ready";
}

function renderPublicationSummary(publication = {}) {
  const state = publicationSummaryState(publication);

  return `
    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Websiteweergave</h2>
        ${renderStatusBadge(state, state === "ready" ? "Gereed voor publicatie" : "Aandachtspunten")}
      </div>
      <div class="studio-grid studio-grid-4">
        ${renderOverviewMetric({
          label: "Gereed voor publicatie",
          value: publication.ready,
          note: "Items die live staan zonder extra websitefeedback.",
          state: publication.ready ? "ready" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Nog afronden",
          value: publication.review,
          note: "Zichtbare items waar relaties, context of PDF-acties extra aandacht vragen.",
          state: publication.review ? "review" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Niet publiek",
          value: publication.not_public,
          note: "Items die niet zichtbaar zijn op de website, meestal door status of ontbrekende relatie.",
          state: publication.not_public ? "review" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Geen websiteweergave",
          value: publication.not_applicable,
          note: "Modules die nog geen gecontroleerde websiteweergave hebben.",
          state: publication.not_applicable ? "foundation" : "ready"
        })}
      </div>
    </section>
  `;
}

function renderModulePublication(module) {
  const publication = module?.publication || {};

  return `
    <section>
      <h4>Websiteweergave</h4>
      <dl class="studio-detail-list">
        <div>
          <dt>Gereed voor publicatie</dt>
          <dd>${Number(publication.ready || 0)} ${renderStatusBadge(publication.ready ? "ready" : "foundation")}</dd>
        </div>
        <div>
          <dt>Nog afronden</dt>
          <dd>${Number(publication.review || 0)} ${renderStatusBadge(publication.review ? "review" : "foundation")}</dd>
        </div>
        <div>
          <dt>Niet publiek</dt>
          <dd>${Number(publication.not_public || 0)} ${renderStatusBadge(publication.not_public ? "review" : "foundation")}</dd>
        </div>
      </dl>
    </section>
  `;
}

export function renderGovernancePage({ supplierData, brochureData, mediaData, articleData, libraryData }) {
  const report = getContentGovernanceReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData,
    library: libraryData
  });
  const readinessReport = getContentReadinessReport(
    {
      suppliers: supplierData,
      brochures: brochureData,
      media: mediaData,
      articles: articleData,
      library: libraryData
    },
    { governanceReport: report }
  );
  const readinessModules = new Map(readinessReport.modules.map((module) => [module.id, module]));

  return `
    <div data-governance-page>
      ${renderPageHeader({
        eyebrow: "Content Governance",
        title: "Governance",
        description:
          "Bekijk welke Studio-content aandacht nodig heeft. Dit overzicht is read-only en wijzigt geen data."
      })}

      ${renderNotice({
        title: "Read-only overzicht",
        message:
          "Governance verzamelt bestaande validatie-, quality- en relatiesignalen uit de bewerkversie. Er wordt niets opgeslagen, de website wordt niet bijgewerkt en er wordt niets automatisch opgelost.",
        tone: "info"
      })}

      <section class="studio-section">
        <div class="studio-section-head">
          <h2>Algemeen overzicht</h2>
          ${renderStatusBadge(report.valid ? "foundation" : "review")}
        </div>
        <div class="studio-grid studio-grid-4">
          ${renderOverviewMetric({
            label: "Issues",
            value: report.totals.issueCount,
            note: "Concrete aandachtspunten met een doelroute.",
            state: report.totals.issueCount ? "review" : "foundation"
          })}
          ${renderOverviewMetric({
            label: "Fouten",
            value: report.totals.issueErrors,
            note: "Blokkerende issues uit bestaande validators.",
            state: report.totals.issueErrors ? "error" : "foundation"
          })}
          ${renderOverviewMetric({
            label: "Waarschuwingen",
            value: report.totals.issueWarnings,
            note: "Niet-blokkerende issues uit bestaande checks.",
            state: report.totals.issueWarnings ? "warning" : "foundation"
          })}
          ${renderOverviewMetric({
            label: "Modules met aandacht",
            value: report.totals.modulesWithAttention,
            note: "Modules met minimaal een issue.",
            state: report.totals.modulesWithAttention ? "review" : "foundation"
          })}
        </div>
      </section>

      ${renderReadinessSummary(readinessReport.totals)}
      ${renderPublicationSummary(readinessReport.totals.publication)}

      <section class="studio-section">
        <div class="studio-section-head">
          <h2>Issue-overzicht</h2>
          ${renderStatusBadge(report.totals.issueCount ? "review" : "foundation")}
        </div>
        ${renderIssueFilters(report.modules)}
        ${renderIssueOverview(report.modules, report.issues)}
      </section>

      <section class="studio-section">
        <div class="studio-section-head">
          <h2>Modules</h2>
        </div>
        <div class="studio-grid studio-grid-1">
          ${report.modules.map((module) => renderModuleCard(module, readinessModules.get(module.id))).join("")}
        </div>
      </section>
    </div>
  `;
}

function selectedSeverityLabel(value) {
  return SEVERITY_FILTERS.find((filter) => filter.value === value)?.label || SEVERITY_FILTERS[0].label;
}

export function setupGovernancePage(root = document) {
  const page = root.querySelector("[data-governance-page]");
  const form = page?.querySelector("[data-governance-filters]");
  if (!page || !form) return;

  const issueRows = [...page.querySelectorAll("[data-governance-issue]")];
  const issueGroupsElements = [...page.querySelectorAll("[data-governance-issue-group]")];
  const emptyState = page.querySelector("[data-governance-issue-empty]");
  const activeSeverity = page.querySelector("[data-governance-active-severity]");
  const activeModule = page.querySelector("[data-governance-active-module]");
  const moduleSelect = form.elements.module;

  function applyFilters() {
    const severity = form.elements.severity?.value || "all";
    const moduleId = moduleSelect?.value || "all";
    const groupCounts = new Map();
    let visibleIssues = 0;

    issueRows.forEach((row) => {
      const severityMatches = severity === "all" || row.dataset.severity === severity;
      const moduleMatches = moduleId === "all" || row.dataset.module === moduleId;
      const visible = severityMatches && moduleMatches;

      row.hidden = !visible;
      if (!visible) return;

      visibleIssues += 1;
      groupCounts.set(row.dataset.module, (groupCounts.get(row.dataset.module) || 0) + 1);
    });

    issueGroupsElements.forEach((group) => {
      const count = groupCounts.get(group.dataset.module) || 0;
      group.hidden = count === 0;
      const countTarget = group.querySelector("[data-governance-group-count]");
      if (countTarget) countTarget.textContent = issueCountLabel(count);
    });

    if (emptyState) emptyState.hidden = visibleIssues > 0;
    if (activeSeverity) activeSeverity.textContent = selectedSeverityLabel(severity);
    if (activeModule) {
      activeModule.textContent = moduleId === "all" ? "Alle modules" : moduleSelect?.selectedOptions?.[0]?.textContent || "Alle modules";
    }
  }

  form.addEventListener("change", applyFilters);
  applyFilters();
}
