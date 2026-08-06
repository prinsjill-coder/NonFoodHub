export const CONTENT_STATUSES = ["concept", "ready", "published", "archived"];

export const LEGACY_CONTENT_STATUS_MIGRATIONS = {
  review: "concept",
  hidden: "archived"
};

export const CONTENT_STATUS_LABELS = {
  concept: "Concept",
  ready: "Gereed voor publicatie",
  published: "Gepubliceerd",
  archived: "Gearchiveerd"
};

export const CONTENT_STATUS_SORT_ORDER = Object.fromEntries(CONTENT_STATUSES.map((status, index) => [status, index]));

export function isContentStatus(status) {
  return CONTENT_STATUSES.includes(status);
}

export function normalizeContentStatus(status) {
  const value = String(status || "").trim();
  return LEGACY_CONTENT_STATUS_MIGRATIONS[value] || value;
}

export function isReadyForPublicationStatus(status) {
  return ["ready", "published"].includes(normalizeContentStatus(status));
}

export function getContentStatusLabel(status) {
  const normalizedStatus = normalizeContentStatus(status);
  return CONTENT_STATUS_LABELS[normalizedStatus] || normalizedStatus;
}

export function sortContentStatuses(statuses) {
  return [...statuses].sort((first, second) => {
    const firstOrder = CONTENT_STATUS_SORT_ORDER[first] ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = CONTENT_STATUS_SORT_ORDER[second] ?? Number.MAX_SAFE_INTEGER;
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return String(first).localeCompare(String(second), "nl");
  });
}
