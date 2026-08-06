import { escapeHtml } from "../shared/utils.js";

export function renderFilterToolbar({
  searchPlaceholder,
  filters = [],
  actions = "",
  scope = "supplier",
  ariaLabel = "Leveranciersfilters"
}) {
  const safeScope = escapeHtml(scope);
  const filterFields = filters
    .map((filter) => {
      const options = filter.options
        .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
        .join("");
      return `
        <label>
          <span>${escapeHtml(filter.label)}</span>
          <select data-${safeScope}-filter="${escapeHtml(filter.name)}">${options}</select>
        </label>
      `;
    })
    .join("");

  return `
    <section class="studio-toolbar" aria-label="${escapeHtml(ariaLabel)}">
      <label class="studio-toolbar-search">
        <span>Zoeken</span>
        <div class="studio-toolbar-search-control">
          <input data-${safeScope}-search data-studio-list-search type="search" placeholder="${escapeHtml(searchPlaceholder)}">
          <button class="studio-search-clear" type="button" data-${safeScope}-search-clear hidden>Wissen</button>
        </div>
      </label>
      ${filterFields}
      <div class="studio-toolbar-actions">${actions}</div>
    </section>
  `;
}
