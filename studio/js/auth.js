import { STUDIO_CONFIG } from "../../shared/config.js";
import { escapeHtml } from "../../shared/utils.js";

export function getAuthPlaceholder() {
  return {
    isAuthenticated: false,
    label: STUDIO_CONFIG.authPlaceholder.label,
    title: STUDIO_CONFIG.authPlaceholder.title,
    message: STUDIO_CONFIG.authPlaceholder.message
  };
}

export function renderAuthPlaceholder(authState) {
  return `
    <aside class="studio-auth-placeholder" aria-label="${escapeHtml(authState.title)}">
      <strong>${escapeHtml(authState.label)}</strong>
      <span>${escapeHtml(authState.message)}</span>
    </aside>
  `;
}
