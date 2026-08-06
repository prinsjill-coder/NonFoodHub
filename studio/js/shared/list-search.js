const DIACRITIC_MARKS = /[\u0300-\u036f]/g;

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

export function matchesSearch(element, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return String(element?.dataset?.search || "").includes(normalizedQuery);
}

export function readFilterValues(filters, scope) {
  return Object.fromEntries(filters.map((filter) => [filter.dataset[`${scope}Filter`], filter.value]));
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
