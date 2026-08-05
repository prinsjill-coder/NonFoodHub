import { escapeHtml } from "../shared/utils.js";

const DEFAULT_STEPS = [
  {
    label: "Concept",
    text: "Je kunt content voorbereiden zonder dat deze op de website staat."
  },
  {
    label: "Review",
    text: "Controleer tekst, relaties en bestanden voordat de content verder kan."
  },
  {
    label: "Publiceerbaar",
    text: "De content is klaar om via de handmatige overdracht naar de website te gaan."
  },
  {
    label: "Gepubliceerd",
    text: "De content staat pas live na controle, overdracht en Website bijwerken."
  }
];

const DEFAULT_NEXT_STEP =
  "Volgende stap na export: gegevens controleren, publieke websitegegevens bijwerken en daarna handmatig publiceren.";

export function renderWorkflowPanel({
  title = "Van beheer naar website",
  intro = "Gebruik deze stappen om te zien waar content staat in de beheerflow.",
  steps = DEFAULT_STEPS,
  nextStep = DEFAULT_NEXT_STEP
} = {}) {
  const stepItems = steps
    .map(
      (step) => `
        <li class="studio-workflow-step">
          <strong>${escapeHtml(step.label)}</strong>
          <span>${escapeHtml(step.text)}</span>
        </li>
      `
    )
    .join("");

  return `
    <section class="studio-section">
      <article class="studio-card studio-workflow-panel">
        <div class="studio-card-head">
          <div>
            <h2>${escapeHtml(title)}</h2>
            <p class="studio-muted">${escapeHtml(intro)}</p>
          </div>
        </div>
        <ol class="studio-workflow-steps">${stepItems}</ol>
        ${nextStep ? `<p class="studio-meta">${escapeHtml(nextStep)}</p>` : ""}
      </article>
    </section>
  `;
}
