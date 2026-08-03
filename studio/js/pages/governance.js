import { renderButton } from "../../../components/button.js";
import { renderNotice } from "../../../components/notice.js";
import { renderPageHeader } from "../../../components/page-header.js";
import { renderStatusBadge } from "../../../components/status-badge.js";
import { getContentGovernanceReport } from "../../../shared/content-governance.js";
import { escapeHtml } from "../../../shared/utils.js";

function renderOverviewMetric({ label, value, note, state = "foundation" }) {
  return `
    <article class="studio-card studio-metric-card">
      <div class="studio-card-head">
        <h3>${escapeHtml(label)}</h3>
        ${renderStatusBadge(state)}
      </div>
      <p class="studio-metric-value">${Number(value || 0)}</p>
      <p class="studio-muted">${escapeHtml(note)}</p>
    </article>
  `;
}

function renderStatusDistribution(module) {
  const statuses = [
    ["published", "Gepubliceerd", module.published],
    ["concept", "Concept", module.concept],
    ["review", "Review", module.review],
    ["hidden", "Verborgen", module.hidden],
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

function severityLabel(severity) {
  return severity === "error" ? "Fout" : "Waarschuwing";
}

function severityState(severity) {
  return severity === "error" ? "error" : "warning";
}

function renderIssueRow(issue) {
  return `
    <article class="studio-issue-row">
      <div class="studio-issue-main">
        <div class="studio-issue-meta">
          <strong>${escapeHtml(issue.moduleLabel || issue.module)}</strong>
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

function renderIssueOverview(issues) {
  if (!issues.length) {
    return `
      <article class="studio-card">
        <h3>Geen issues gevonden</h3>
        <p class="studio-muted">De bestaande governance-signalen bevatten geen fouten of waarschuwingen.</p>
      </article>
    `;
  }

  return `
    <div class="studio-issue-list">
      ${issues.map(renderIssueRow).join("")}
    </div>
  `;
}

function renderModuleCard(module) {
  const state = module.blockers ? "review" : module.warnings || module.missingFiles || module.missingMedia || module.brokenRelations ? "review" : "foundation";

  return `
    <article class="studio-card">
      <div class="studio-card-head">
        <div>
          <h3>${escapeHtml(module.label)}</h3>
          <p class="studio-muted">Read-only samenvatting uit de actieve Studio-werksessie.</p>
        </div>
        ${renderStatusBadge(state)}
      </div>

      <div class="studio-grid studio-grid-4">
        ${renderOverviewMetric({
          label: "Items",
          value: module.total,
          note: "Geregistreerde items.",
          state: "foundation"
        })}
        ${renderOverviewMetric({
          label: "Waarschuwingen",
          value: module.warnings,
          note: "Niet-blokkerende signalen.",
          state: module.warnings ? "review" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Blokkades",
          value: module.blockers,
          note: "Actiegerichte fouten.",
          state: module.blockers ? "review" : "foundation"
        })}
        ${renderOverviewMetric({
          label: "Relaties/media",
          value: module.missingFiles + module.missingMedia + module.brokenRelations + module.usageSignals,
          note: "Bestanden, mediaregistraties en relaties.",
          state: module.missingFiles + module.missingMedia + module.brokenRelations + module.usageSignals ? "review" : "foundation"
        })}
      </div>

      <div class="studio-grid studio-grid-2">
        <section>
          <h4>Statusverdeling</h4>
          ${renderStatusDistribution(module)}
        </section>
        <section>
          <h4>Governance-signalen</h4>
          ${renderSignals(module)}
        </section>
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

export function renderGovernancePage({ supplierData, brochureData, mediaData, articleData, libraryData }) {
  const report = getContentGovernanceReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData,
    library: libraryData
  });

  return `
    ${renderPageHeader({
      eyebrow: "Content Governance",
      title: "Governance",
      description:
        "Bekijk welke Studio-content aandacht nodig heeft. Dit overzicht is read-only en wijzigt geen data."
    })}

    ${renderNotice({
      title: "Read-only overzicht",
      message:
        "Governance verzamelt bestaande validatie-, quality- en relatiesignalen uit actieve browserwerksessies. Er wordt niets opgeslagen, gepubliceerd of automatisch opgelost.",
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

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Issue-overzicht</h2>
        ${renderStatusBadge(report.totals.issueCount ? "review" : "foundation")}
      </div>
      ${renderIssueOverview(report.issues)}
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Modules</h2>
      </div>
      <div class="studio-grid studio-grid-1">
        ${report.modules.map(renderModuleCard).join("")}
      </div>
    </section>
  `;
}
