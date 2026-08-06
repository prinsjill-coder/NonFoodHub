import { escapeHtml } from "../../../shared/utils.js";

const pendingListStates = new Map();

export function setListStateHandoff(scope, state = {}) {
  if (!scope) return;

  pendingListStates.set(scope, {
    search: state.search || "",
    filters: state.filters || {},
    sort: state.sort || ""
  });
}

export function consumeListStateHandoff(scope) {
  const state = pendingListStates.get(scope);
  pendingListStates.delete(scope);
  return state || null;
}

export function renderListStateHandoffAttributes({ scope, search = "", filters = {}, sort = "" } = {}) {
  if (!scope) return "";

  const state = JSON.stringify({ search, filters, sort });
  return `
    data-list-handoff
    data-list-handoff-scope="${escapeHtml(scope)}"
    data-list-handoff-state="${escapeHtml(state)}"
  `;
}

export function applyListStateHandoffFromLink(link) {
  const scope = link?.dataset?.listHandoffScope || "";
  const state = link?.dataset?.listHandoffState || "";
  if (!scope || !state) return;

  try {
    setListStateHandoff(scope, JSON.parse(state));
  } catch {
    setListStateHandoff(scope, {});
  }
}

export function setupListStateHandoff(root = document) {
  root.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;

    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const link = target?.closest("a[data-list-handoff]");
    if (!link || link.target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    applyListStateHandoffFromLink(link);
  });
}
