import { escapeHtml, renderAttributes } from "../shared/utils.js";

export function renderProjectFileChoice({
  id,
  label,
  accept,
  targetField,
  currentPath = "",
  expectedPath = "",
  help = "",
  attributes = {},
  inputAttributes = {}
}) {
  const hasCurrentPath = Boolean(currentPath);
  const choiceText = hasCurrentPath ? "Geen nieuw lokaal bestand gekozen" : "Geen lokaal bestand gekozen in dit formulier";
  const stateText = hasCurrentPath ? "Bestaand projectbestand blijft gekoppeld" : "Wachten op keuze";

  return `
    <div
      class="studio-field studio-file-picker"
      data-project-file-picker
      data-target-field="${escapeHtml(targetField)}"
      data-current-path="${escapeHtml(currentPath)}"
      data-expected-path="${escapeHtml(expectedPath)}"
      ${renderAttributes(attributes)}
    >
      <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <input id="${escapeHtml(id)}" type="file" accept="${escapeHtml(accept)}" data-project-file-choice${renderAttributes(inputAttributes)}>
      <p class="studio-field-help">${escapeHtml(help)}</p>
      <dl class="studio-file-choice-summary" data-file-choice-summary aria-live="polite">
        <div>
          <dt>Gekozen lokaal bestand</dt>
          <dd data-file-choice-name>${escapeHtml(choiceText)}</dd>
        </div>
        <div>
          <dt>Gekoppeld projectbestand</dt>
          <dd class="${hasCurrentPath ? "studio-meta" : "studio-muted"}" data-file-current-path>${escapeHtml(currentPath || "Nog geen projectbestand gekoppeld")}</dd>
        </div>
        <div>
          <dt>Bestandstype</dt>
          <dd data-file-choice-type>Niet gekozen</dd>
        </div>
        <div>
          <dt>Bestandsgrootte</dt>
          <dd data-file-choice-size>Niet gekozen</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd data-file-choice-state>${escapeHtml(stateText)}</dd>
        </div>
        <div>
          <dt>Verwachte projectbestandsnaam</dt>
          <dd data-file-choice-expected>${escapeHtml(expectedPath || currentPath || "Nog niet bekend")}</dd>
        </div>
      </dl>
      <p class="studio-field-help">
        ${hasCurrentPath
          ? "Laat dit leeg als je het bestaande projectbestand wilt behouden. Kies alleen een nieuw lokaal bestand als je de koppeling wilt vervangen."
          : "Studio neemt de gekozen bestandsnaam over en normaliseert deze naar een veilige projectbestandsnaam. Plaats het bestand daarna zelf onder die naam in de projectmap."}
      </p>
    </div>
  `;
}

