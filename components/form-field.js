import { escapeHtml } from "../shared/utils.js";

function sanitizeIdPart(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "field";
}

export function getFieldId(name, id = "") {
  return id || `studio-field-${sanitizeIdPart(name)}`;
}

function describedByIds({ fieldId, help }) {
  return [help ? `${fieldId}-help` : "", `${fieldId}-error`].filter(Boolean).join(" ");
}

function renderRequirement(required) {
  return required
    ? ` <span class="studio-required-label">(verplicht)</span>`
    : ` <span class="studio-optional-label">(optioneel)</span>`;
}

function renderHelp(help, fieldId) {
  return help ? `<p id="${escapeHtml(fieldId)}-help" class="studio-field-help">${escapeHtml(help)}</p>` : "";
}

function renderError(name, fieldId) {
  return `<p id="${escapeHtml(fieldId)}-error" class="studio-field-error" data-field-error="${escapeHtml(name)}" aria-live="polite"></p>`;
}

export function renderTextField({ name, label, value = "", type = "text", required = false, help = "", placeholder = "", id = "" }) {
  const fieldId = getFieldId(name, id);
  const descriptionIds = describedByIds({ fieldId, help });
  return `
    <div class="studio-field" data-field="${escapeHtml(name)}">
      <label for="${escapeHtml(fieldId)}">${escapeHtml(label)}${renderRequirement(required)}</label>
      <input
        id="${escapeHtml(fieldId)}"
        name="${escapeHtml(name)}"
        type="${escapeHtml(type)}"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
        aria-describedby="${escapeHtml(descriptionIds)}"
        ${required ? "required" : ""}
      >
      ${renderHelp(help, fieldId)}
      ${renderError(name, fieldId)}
    </div>
  `;
}

export function renderTextAreaField({ name, label, value = "", required = false, help = "", rows = 5, id = "" }) {
  const fieldId = getFieldId(name, id);
  const descriptionIds = describedByIds({ fieldId, help });
  return `
    <div class="studio-field" data-field="${escapeHtml(name)}">
      <label for="${escapeHtml(fieldId)}">${escapeHtml(label)}${renderRequirement(required)}</label>
      <textarea
        id="${escapeHtml(fieldId)}"
        name="${escapeHtml(name)}"
        rows="${rows}"
        aria-describedby="${escapeHtml(descriptionIds)}"
        ${required ? "required" : ""}
      >${escapeHtml(value)}</textarea>
      ${renderHelp(help, fieldId)}
      ${renderError(name, fieldId)}
    </div>
  `;
}

export function renderSelectField({ name, label, value = "", options = [], required = false, help = "", id = "" }) {
  const fieldId = getFieldId(name, id);
  const descriptionIds = describedByIds({ fieldId, help });
  const optionItems = options
    .map((option) => {
      const optionValue = typeof option === "string" ? option : option.value;
      const optionLabel = typeof option === "string" ? option : option.label;
      return `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`;
    })
    .join("");

  return `
    <div class="studio-field" data-field="${escapeHtml(name)}">
      <label for="${escapeHtml(fieldId)}">${escapeHtml(label)}${renderRequirement(required)}</label>
      <select
        id="${escapeHtml(fieldId)}"
        name="${escapeHtml(name)}"
        aria-describedby="${escapeHtml(descriptionIds)}"
        ${required ? "required" : ""}
      >${optionItems}</select>
      ${renderHelp(help, fieldId)}
      ${renderError(name, fieldId)}
    </div>
  `;
}

export function renderCheckboxField({ name, label, checked = false, help = "", id = "" }) {
  const fieldId = getFieldId(name, id);
  const descriptionIds = describedByIds({ fieldId, help });
  return `
    <div class="studio-check-field" data-field="${escapeHtml(name)}">
      <input
        id="${escapeHtml(fieldId)}"
        name="${escapeHtml(name)}"
        type="checkbox"
        aria-describedby="${escapeHtml(descriptionIds)}"
        ${checked ? "checked" : ""}
      >
      <label for="${escapeHtml(fieldId)}">${escapeHtml(label)}${renderRequirement(false)}</label>
      ${renderHelp(help, fieldId)}
      ${renderError(name, fieldId)}
    </div>
  `;
}

export function renderCheckboxGroup({ name, label, values = [], options = [], help = "", required = false, id = "" }) {
  const fieldId = getFieldId(name, id);
  const descriptionIds = describedByIds({ fieldId, help });
  const selectedValues = new Set(values);
  const items = options
    .map((option) => {
      const optionId = `${fieldId}-${sanitizeIdPart(option)}`;
      return `
      <label class="studio-check-pill" for="${escapeHtml(optionId)}">
        <input id="${escapeHtml(optionId)}" name="${escapeHtml(name)}" type="checkbox" value="${escapeHtml(option)}" aria-describedby="${escapeHtml(descriptionIds)}" ${selectedValues.has(option) ? "checked" : ""}>
        <span>${escapeHtml(option)}</span>
      </label>
    `;
    })
    .join("");

  return `
    <fieldset id="${escapeHtml(fieldId)}" class="studio-fieldset" data-field="${escapeHtml(name)}" aria-describedby="${escapeHtml(descriptionIds)}">
      <legend>${escapeHtml(label)}${renderRequirement(required)}</legend>
      ${renderHelp(help, fieldId)}
      <div class="studio-check-grid">${items}</div>
      ${renderError(name, fieldId)}
    </fieldset>
  `;
}
