import { renderButton } from "../../../components/button.js";
import { renderMetricCard, renderPanelCard } from "../../../components/card.js";
import { renderEmptyState } from "../../../components/empty-state.js";
import { renderPageHeader } from "../../../components/page-header.js";
import { renderStatusBadge } from "../../../components/status-badge.js";
import { escapeHtml } from "../../../shared/utils.js";

function renderQuickAction(action) {
  return `
    <article class="studio-card">
      <div class="studio-card-head">
        <h3>${escapeHtml(action.label)}</h3>
        ${renderStatusBadge(action.enabled ? "foundation" : "disabled")}
      </div>
      <p class="studio-muted">${escapeHtml(action.message)}</p>
      ${renderButton({
        label: action.enabled ? "Openen" : "Niet actief",
        variant: "secondary",
        disabled: !action.enabled
      })}
    </article>
  `;
}

export function renderDashboard(dashboardData) {
  const metrics = dashboardData.metrics.map(renderMetricCard).join("");
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
      "Deze route is bewust als placeholder opgenomen in Sprint 1. CRUD, formulieren, uploads en contentbeheer worden pas in een latere sprint gebouwd.",
    label: "Placeholder"
  });
}
