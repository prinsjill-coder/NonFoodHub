import { renderStatusBadge } from "./status-badge.js";
import { publicationStateForItem } from "../shared/publication-status.js";
import { escapeHtml } from "../shared/utils.js";

export function renderPublicationStateCard({ moduleId, item, publicData }) {
  const state = publicationStateForItem(moduleId, item, publicData);

  return `
    <section class="studio-section">
      <article class="studio-card">
        <div class="studio-card-head">
          <div>
            <h2>Publicatiestatus</h2>
            <p class="studio-muted">${escapeHtml(state.message)}</p>
          </div>
          ${renderStatusBadge(state.status, state.label)}
        </div>
        <p class="studio-meta">${escapeHtml(state.nextStep)}</p>
      </article>
    </section>
  `;
}
