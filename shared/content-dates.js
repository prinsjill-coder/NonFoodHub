export const CONTENT_UPDATED_AT_FIELD = "updatedAt";

export function createUpdatedAtTimestamp(date = new Date()) {
  return date.toISOString();
}

export function parseUpdatedAtTimestamp(value) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00Z`);
    const timestamp = date.getTime();
    return Number.isFinite(timestamp) && date.toISOString().slice(0, 10) === raw ? timestamp : null;
  }

  if (/^\d+$/.test(raw)) {
    const numericTimestamp = Number(raw);
    if (!Number.isFinite(numericTimestamp)) return null;
    return numericTimestamp < 1000000000000 ? numericTimestamp * 1000 : numericTimestamp;
  }

  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw)) return null;

  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isValidUpdatedAt(value) {
  return parseUpdatedAtTimestamp(value) !== null;
}

export function updatedAtSortValue(value) {
  return parseUpdatedAtTimestamp(value) ?? Number.NEGATIVE_INFINITY;
}

export function updatedAtDateInputValue(value) {
  const timestamp = parseUpdatedAtTimestamp(value);
  return timestamp === null ? "" : new Date(timestamp).toISOString().slice(0, 10);
}

export function compareUpdatedAt(first, second, direction = "asc") {
  const firstTimestamp = updatedAtSortValue(first);
  const secondTimestamp = updatedAtSortValue(second);
  if (firstTimestamp === secondTimestamp) return 0;
  return direction === "desc" ? secondTimestamp - firstTimestamp : firstTimestamp - secondTimestamp;
}

export function markContentUpdated(item, date = new Date()) {
  return {
    ...item,
    [CONTENT_UPDATED_AT_FIELD]: createUpdatedAtTimestamp(date)
  };
}
