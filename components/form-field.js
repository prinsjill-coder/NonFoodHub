import { escapeHtml } from "../shared/utils.js";

function renderHelp(help) {
  return help ? `<p class="studio-field-help">${escapeHtml(help)}</p>` : "";
}

function renderError(name) {
  return `<p class="studio-field-error" data-field-error="${escapeHtml(name)}"></p>`;
}

export function renderTextField({ name, label, value = "", type = "text", required = false, help = "", placeholder = "" }) {
  return `
    <label class="studio-field" data-field="${escapeHtml(name)}">
      <span>${escapeHtml(label)}${required ? " *" : ""}</span>
      <input
        name="${escapeHtml(name)}"
        type="${escapeHtml(type)}"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
        ${required ? "required" : ""}
      >
      ${renderHelp(help)}
      ${renderError(name)}
    </label>
  `;
}

export function renderTextAreaField({ name, label, value = "", required = false, help = "", rows = 5 }) {
  return `
    <label class="studio-field" data-field="${escapeHtml(name)}">
      <span>${escapeHtml(label)}${required ? " *" : ""}</span>
      <textarea name="${escapeHtml(name)}" rows="${rows}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea>
      ${renderHelp(help)}
      ${renderError(name)}
    </label>
  `;
}

export function renderSelectField({ name, label, value = "", options = [], required = false, help = "" }) {
  const optionItems = options
    .map((option) => {
      const optionValue = typeof option === "string" ? option : option.value;
      const optionLabel = typeof option === "string" ? option : option.label;
      return `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`;
    })
    .join("");

  return `
    <label class="studio-field" data-field="${escapeHtml(name)}">
      <span>${escapeHtml(label)}${required ? " *" : ""}</span>
      <select name="${escapeHtml(name)}" ${required ? "required" : ""}>${optionItems}</select>
      ${renderHelp(help)}
      ${renderError(name)}
    </label>
  `;
}

export function renderCheckboxField({ name, label, checked = false, help = "" }) {
  return `
    <label class="studio-check-field" data-field="${escapeHtml(name)}">
      <input name="${escapeHtml(name)}" type="checkbox" ${checked ? "checked" : ""}>
      <span>${escapeHtml(label)}</span>
      ${renderHelp(help)}
    </label>
  `;
}

export function renderCheckboxGroup({ name, label, values = [], options = [], help = "" }) {
  const selectedValues = new Set(values);
  const items = options
    .map((option) => `
      <label class="studio-check-pill">
        <input name="${escapeHtml(name)}" type="checkbox" value="${escapeHtml(option)}" ${selectedValues.has(option) ? "checked" : ""}>
        <span>${escapeHtml(option)}</span>
      </label>
    `)
    .join("");

  return `
    <fieldset class="studio-fieldset" data-field="${escapeHtml(name)}">
      <legend>${escapeHtml(label)}</legend>
      ${renderHelp(help)}
      <div class="studio-check-grid">${items}</div>
      ${renderError(name)}
    </fieldset>
  `;
}

