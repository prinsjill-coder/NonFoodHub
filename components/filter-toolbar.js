import { escapeHtml } from "../shared/utils.js";

export function renderFilterToolbar({
  searchPlaceholder,
  filters = [],
  sortOptions = [],
  defaultSort = "name-asc",
  actions = "",
  scope = "supplier",
  ariaLabel = "Leveranciersfilters",
  clearLabel = "Alle filters wissen"
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
          <select data-${safeScope}-filter="${escapeHtml(filter.name)}" data-filter-label="${escapeHtml(filter.label)}">${options}</select>
        </label>
      `;
    })
    .join("");
  const sortField = sortOptions.length
    ? `
        <label>
          <span>Sorteren</span>
          <select data-${safeScope}-sort>
            ${sortOptions
              .map(
                (option) =>
                  `<option value="${escapeHtml(option.value)}"${option.value === defaultSort ? " selected" : ""}>${escapeHtml(option.label)}</option>`
              )
              .join("")}
          </select>
        </label>
      `
    : "";

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
      ${sortField}
      <div class="studio-toolbar-actions">${actions}</div>
    </section>
    <section class="studio-filter-summary" data-${safeScope}-filter-summary hidden aria-live="polite">
      <div>
        <strong>Actieve filters</strong>
        <div class="studio-filter-summary-items" data-${safeScope}-filter-summary-items></div>
      </div>
      <button class="studio-button studio-button-secondary" type="button" data-${safeScope}-clear-filters>${escapeHtml(clearLabel)}</button>
    </section>
  `;
}
