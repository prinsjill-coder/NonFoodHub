import { escapeHtml } from "../shared/utils.js";

export function renderFilterToolbar({ searchPlaceholder, filters = [], actions = "" }) {
  const filterFields = filters
    .map((filter) => {
      const options = filter.options
        .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
        .join("");
      return `
        <label>
          <span>${escapeHtml(filter.label)}</span>
          <select data-supplier-filter="${escapeHtml(filter.name)}">${options}</select>
        </label>
      `;
    })
    .join("");

  return `
    <section class="studio-toolbar" aria-label="Leveranciersfilters">
      <label class="studio-toolbar-search">
        <span>Zoeken</span>
        <input data-supplier-search type="search" placeholder="${escapeHtml(searchPlaceholder)}">
      </label>
      ${filterFields}
      <div class="studio-toolbar-actions">${actions}</div>
    </section>
  `;
}

