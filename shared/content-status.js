export const CONTENT_STATUSES = ["concept", "review", "published", "hidden", "archived"];

export const CONTENT_STATUS_LABELS = {
  concept: "Concept",
  review: "Review",
  published: "Gepubliceerd",
  hidden: "Verborgen",
  archived: "Gearchiveerd"
};

export const CONTENT_STATUS_SORT_ORDER = Object.fromEntries(CONTENT_STATUSES.map((status, index) => [status, index]));

export function isContentStatus(status) {
  return CONTENT_STATUSES.includes(status);
}

export function getContentStatusLabel(status) {
  return CONTENT_STATUS_LABELS[status] || status;
}

export function sortContentStatuses(statuses) {
  return [...statuses].sort((first, second) => {
    const firstOrder = CONTENT_STATUS_SORT_ORDER[first] ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = CONTENT_STATUS_SORT_ORDER[second] ?? Number.MAX_SAFE_INTEGER;
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return String(first).localeCompare(String(second), "nl");
  });
}
