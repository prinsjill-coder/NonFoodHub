import { updatedAtSortValue } from "../../../shared/content-dates.js";
import { consumeListStateHandoff } from "./list-state-handoff.js";

const DIACRITIC_MARKS = /[\u0300-\u036f]/g;
const STATUS_SORT_ORDER = {
  concept: 0,
  ready: 1,
  published: 2,
  archived: 3
};

const COLLATOR = new Intl.Collator("nl", {
  numeric: true,
  sensitivity: "base"
});

export const DEFAULT_SORT_OPTIONS = [
  { value: "name-asc", label: "Naam A-Z" },
  { value: "name-desc", label: "Naam Z-A" },
  { value: "updated-desc", label: "Laatst gewijzigd (nieuwste)" },
  { value: "updated-asc", label: "Laatst gewijzigd (oudste)" },
  { value: "workflow", label: "Workflowstatus" }
];

export const YES_NO_FILTER_OPTIONS = [
  { value: "all", label: "Alles" },
  { value: "yes", label: "Ja" },
  { value: "no", label: "Nee" }
];

export const WEBSITE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Alles" },
  { value: "live", label: "Live" },
  { value: "not_live", label: "Niet live" }
];

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(DIACRITIC_MARKS, "")
    .toLocaleLowerCase("nl-NL")
    .trim();
}

export function createSearchText(...values) {
  return normalizeSearchText(values.flat(Infinity).filter((value) => value !== null && value !== undefined).join(" "));
}

export function filterToken(value) {
  return normalizeSearchText(value).replaceAll("|", "");
}

export function createFilterTokens(...values) {
  return values
    .flat(Infinity)
    .map(filterToken)
    .filter(Boolean)
    .join("|");
}

export function booleanFilterValue(value) {
  return value ? "yes" : "no";
}

export function matchesSearch(element, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return String(element?.dataset?.search || "").includes(normalizedQuery);
}

export function readFilterValues(filters, scope) {
  return Object.fromEntries(filters.map((filter) => [filter.dataset[`${scope}Filter`], filter.value]));
}

function filterDatasetKey(name) {
  return `filter${String(name || "").replace(/(^|-)([a-z])/g, (_, _separator, letter) => letter.toUpperCase())}`;
}

function sortValue(element, key) {
  return String(element?.dataset?.[key] || "");
}

function sortDateValue(element) {
  return updatedAtSortValue(sortValue(element, "sortUpdatedAt"));
}

function compareName(first, second) {
  return COLLATOR.compare(sortValue(first, "sortName"), sortValue(second, "sortName"));
}

function compareDate(first, second, direction) {
  const firstDate = sortDateValue(first);
  const secondDate = sortDateValue(second);

  if (firstDate !== secondDate) {
    return direction === "asc" ? firstDate - secondDate : secondDate - firstDate;
  }

  return compareName(first, second);
}

function compareStatus(first, second) {
  const firstOrder = STATUS_SORT_ORDER[sortValue(first, "sortStatus")] ?? Number.MAX_SAFE_INTEGER;
  const secondOrder = STATUS_SORT_ORDER[sortValue(second, "sortStatus")] ?? Number.MAX_SAFE_INTEGER;
  if (firstOrder !== secondOrder) return firstOrder - secondOrder;
  return compareName(first, second);
}

function compareItems(sortMode) {
  return (first, second) => {
    if (sortMode === "name-desc") return compareName(second, first);
    if (sortMode === "updated-desc") return compareDate(first, second, "desc");
    if (sortMode === "updated-asc") return compareDate(first, second, "asc");
    if (sortMode === "workflow") return compareStatus(first, second);
    return compareName(first, second);
  };
}

function matchesFilterValue(itemValue, selectedValue) {
  if (!selectedValue || selectedValue === "all") return true;
  const tokens = String(itemValue || "").split("|").filter(Boolean);
  return tokens.includes(selectedValue);
}

function matchesFilters(element, values) {
  return Object.entries(values).every(([name, selectedValue]) =>
    matchesFilterValue(element?.dataset?.[filterDatasetKey(name)], selectedValue)
  );
}

function uniqueVisibleCount(items) {
  const ids = new Set();
  let fallbackCount = 0;

  items.forEach((item) => {
    if (item.hidden) return;
    const id = item.dataset.listId;
    if (id) {
      ids.add(id);
      return;
    }
    fallbackCount += 1;
  });

  return ids.size || fallbackCount;
}

function sortItemsInPlace(items, sortMode) {
  const byParent = new Map();
  items.forEach((item) => {
    if (!item.parentElement) return;
    if (!byParent.has(item.parentElement)) {
      byParent.set(item.parentElement, []);
    }
    byParent.get(item.parentElement).push(item);
  });

  byParent.forEach((parentItems, parent) => {
    parentItems.sort(compareItems(sortMode)).forEach((item) => parent.appendChild(item));
  });
}

function selectedLabel(select) {
  return select?.selectedOptions?.[0]?.textContent?.trim() || select?.value || "";
}

function currentState({ search, filters, sort, defaultSort }) {
  return {
    query: search?.value || "",
    filterValues: Object.fromEntries(filters.map((filter) => [filter.dataset.filterName, filter.value])),
    sortValue: sort?.value || defaultSort
  };
}

function renderSummary({ search, filters, sort, defaultSort, summary, summaryItems }) {
  if (!summary || !summaryItems) return;

  summaryItems.replaceChildren();

  const chips = [];
  const query = search?.value.trim() || "";
  if (query) {
    chips.push(`Zoeken: ${query}`);
  }

  filters.forEach((filter) => {
    if (!filter.value || filter.value === "all") return;
    const label = filter.dataset.filterLabel || filter.name || "Filter";
    chips.push(`${label}: ${selectedLabel(filter)}`);
  });

  if (sort && sort.value !== defaultSort) {
    chips.push(`Sortering: ${selectedLabel(sort)}`);
  }

  chips.forEach((chip) => {
    const element = document.createElement("span");
    element.textContent = chip;
    summaryItems.appendChild(element);
  });

  summary.hidden = chips.length === 0;
}

function updateEmptyState({ empty, emptyMessage, emptyText, visibleCount }) {
  if (!empty) return;
  empty.hidden = visibleCount > 0;
  if (emptyMessage && visibleCount === 0) {
    emptyMessage.textContent = emptyText;
  }
}

function resetControls({ search, filters, sort, defaultSort }) {
  if (search) {
    search.value = "";
  }
  filters.forEach((filter) => {
    filter.value = "all";
  });
  if (sort) {
    sort.value = defaultSort;
  }
}

function selectValueIfAvailable(select, value) {
  if (!select || value === undefined || value === null || value === "") return;
  const optionExists = Array.from(select.options || []).some((option) => option.value === value);
  if (optionExists) {
    select.value = value;
  }
}

function applyHandoffState({ scope, search, filters, sort }) {
  const state = consumeListStateHandoff(scope);
  if (!state) return;

  if (search && typeof state.search === "string") {
    search.value = state.search;
  }

  filters.forEach((filter) => {
    const filterName = filter.dataset.filterName;
    selectValueIfAvailable(filter, state.filters?.[filterName]);
  });

  selectValueIfAvailable(sort, state.sort);
}

export function setupSearchInput({ search, clearButton, onChange }) {
  if (!search) return;

  function update() {
    if (clearButton) {
      clearButton.hidden = search.value.length === 0;
    }
    onChange();
  }

  search.addEventListener("input", update);
  search.addEventListener("search", update);
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !search.value) return;
    event.preventDefault();
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });

  clearButton?.addEventListener("click", () => {
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    search.focus();
  });

  update();
}

export function setupListControls({
  scope,
  itemSelector,
  emptySelector,
  emptyText = "Geen items gevonden met de huidige zoekterm of filters.",
  defaultSort = "name-asc",
  root = document
}) {
  const search = root.querySelector(`[data-${scope}-search]`);
  const clearSearch = root.querySelector(`[data-${scope}-search-clear]`);
  const filters = Array.from(root.querySelectorAll(`[data-${scope}-filter]`));
  const sort = root.querySelector(`[data-${scope}-sort]`);
  const items = Array.from(root.querySelectorAll(itemSelector));
  const empty = root.querySelector(emptySelector);
  const emptyMessage = root.querySelector(`[data-${scope}-empty-message]`);
  const summary = root.querySelector(`[data-${scope}-filter-summary]`);
  const summaryItems = root.querySelector(`[data-${scope}-filter-summary-items]`);
  const clearAllButtons = Array.from(root.querySelectorAll(`[data-${scope}-clear-filters], [data-${scope}-empty-clear]`));

  filters.forEach((filter) => {
    filter.dataset.filterName = filter.dataset[`${scope}Filter`] || "";
    if (!filter.dataset.filterLabel) {
      filter.dataset.filterLabel = filter.closest("label")?.querySelector("span")?.textContent?.trim() || "Filter";
    }
  });

  applyHandoffState({ scope, search, filters, sort });

  function applyControls() {
    const state = currentState({ search, filters, sort, defaultSort });

    sortItemsInPlace(items, state.sortValue);

    items.forEach((item) => {
      item.hidden = !(matchesSearch(item, state.query) && matchesFilters(item, state.filterValues));
    });

    renderSummary({ search, filters, sort, defaultSort, summary, summaryItems });
    updateEmptyState({ empty, emptyMessage, emptyText, visibleCount: uniqueVisibleCount(items) });
  }

  setupSearchInput({ search, clearButton: clearSearch, onChange: applyControls });
  filters.forEach((filter) => filter.addEventListener("change", applyControls));
  sort?.addEventListener("change", applyControls);
  clearAllButtons.forEach((button) => {
    button.addEventListener("click", () => {
      resetControls({ search, filters, sort, defaultSort });
      search?.dispatchEvent(new Event("input", { bubbles: true }));
      applyControls();
      search?.focus();
    });
  });

  applyControls();
}

export function setupStudioSearchBridge(root = document) {
  const studioSearch = root.querySelector("[data-studio-search]");
  if (!studioSearch) return;

  const pageSearch = root.querySelector("[data-studio-list-search]");
  if (!pageSearch) {
    studioSearch.value = "";
    studioSearch.disabled = true;
    studioSearch.placeholder = "Zoeken beschikbaar op overzichtspagina's";
    studioSearch.setAttribute("aria-disabled", "true");
    return;
  }

  let syncing = false;

  studioSearch.disabled = false;
  studioSearch.removeAttribute("aria-disabled");
  studioSearch.placeholder = pageSearch.placeholder || "Zoeken in deze lijst";
  studioSearch.value = pageSearch.value;

  function syncToPage() {
    if (syncing) return;
    syncing = true;
    pageSearch.value = studioSearch.value;
    pageSearch.dispatchEvent(new Event("input", { bubbles: true }));
    syncing = false;
  }

  function syncToStudio() {
    if (syncing) return;
    syncing = true;
    studioSearch.value = pageSearch.value;
    syncing = false;
  }

  studioSearch.addEventListener("input", syncToPage);
  studioSearch.addEventListener("search", syncToPage);
  studioSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !studioSearch.value) return;
    event.preventDefault();
    studioSearch.value = "";
    syncToPage();
  });
  pageSearch.addEventListener("input", syncToStudio);
  pageSearch.addEventListener("search", syncToStudio);
}
