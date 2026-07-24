import { STUDIO_CONFIG } from "../../shared/config.js";
import { classNames, escapeHtml } from "../../shared/utils.js";
import { renderAuthPlaceholder } from "./auth.js";

function renderSidebarItem(item, currentRoute) {
  const active = item.id === currentRoute.sectionId || item.route === `#${currentRoute.path}`;
  return `
    <a
      class="${classNames("studio-nav-link", active && "is-active", !item.enabled && "is-disabled")}"
      href="${escapeHtml(item.route)}"
      aria-current="${active ? "page" : "false"}"
      title="${escapeHtml(item.description)}"
    >
      <span>${escapeHtml(item.label)}</span>
      <small>${escapeHtml(item.enabled ? item.description : "Placeholder voor latere sprint")}</small>
    </a>
  `;
}

export function renderLayout({ navigation, currentRoute, authState, content }) {
  const navItems = navigation.items.map((item) => renderSidebarItem(item, currentRoute)).join("");

  return `
    <div class="studio-shell">
      <aside class="studio-sidebar">
        <a class="studio-brand" href="#/dashboard" aria-label="${escapeHtml(STUDIO_CONFIG.appName)} dashboard">
          <span class="studio-brand-mark">B</span>
            <span class="studio-brand-text">
              <span class="studio-brand-title">${escapeHtml(STUDIO_CONFIG.appName)}</span>
              <span class="studio-brand-subtitle">Studio prototype</span>
            </span>
          </a>
        <nav class="studio-nav" aria-label="Studio navigatie">${navItems}</nav>
        <p class="studio-sidebar-note">
          Sprint 3 bevat leveranciersbeheer met een tijdelijke import/export-werksessie. Uploads, echte opslag en publicatie-acties zijn niet actief.
        </p>
      </aside>
      <main class="studio-main">
        <header class="studio-topbar">
          <div class="studio-topbar-title">
            <strong>${escapeHtml(STUDIO_CONFIG.projectName)}</strong>
            <span>${escapeHtml(currentRoute.title)}</span>
          </div>
          <input class="studio-search" type="search" placeholder="Zoeken komt in een latere sprint" aria-label="Studio zoeken placeholder" disabled>
          ${renderAuthPlaceholder(authState)}
        </header>
        <div class="studio-content" id="studio-route-content">${content}</div>
      </main>
    </div>
  `;
}
