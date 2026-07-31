import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, getContentStatusLabel } from "./content-status.js";

export const LIBRARY_STATUSES = [...CONTENT_STATUSES];

export const LIBRARY_STATUS_LABELS = CONTENT_STATUS_LABELS;

export const LIBRARY_TYPES = [
  "pdf",
  "catalogus",
  "handleiding",
  "technisch-document",
  "certificaat",
  "presentatie",
  "inspiratie",
  "overig"
];

export const LIBRARY_TYPE_LABELS = {
  pdf: "PDF",
  catalogus: "Catalogus",
  handleiding: "Handleiding",
  "technisch-document": "Technisch document",
  certificaat: "Certificaat",
  presentatie: "Presentatie",
  inspiratie: "Inspiratie",
  overig: "Overig"
};

export const LIBRARY_CATEGORIES = [
  "Leveranciers",
  "Productinformatie",
  "Inspiratie",
  "Techniek",
  "Certificering",
  "Sales"
];

export function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function createEmptyLibraryItem() {
  return {
    id: "",
    title: "",
    slug: "",
    status: "concept",
    type: "overig",
    category: "Productinformatie",
    summary: "",
    filePath: "",
    thumbnailPath: "",
    supplierIds: [],
    brochureIds: [],
    articleIds: [],
    tags: [],
    updatedAt: new Date().toISOString().slice(0, 10),
    sortOrder: 0
  };
}

export function getLibraryItems(libraryData) {
  return Array.isArray(libraryData?.items) ? libraryData.items : [];
}

export function findLibraryItemBySlug(libraryData, slug) {
  return getLibraryItems(libraryData).find((item) => item.slug === slug);
}

export function findLibraryItemById(libraryData, id) {
  return getLibraryItems(libraryData).find((item) => item.id === id);
}

export function sortLibraryItems(items) {
  return [...items].sort((first, second) => {
    const order = Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0);
    if (order !== 0) return order;
    return String(first.title).localeCompare(String(second.title), "nl");
  });
}

function optionId(option) {
  return typeof option === "string" ? option : option?.id;
}

function optionLabel(option) {
  const id = optionId(option);
  return typeof option === "string" ? LIBRARY_TYPE_LABELS[id] || option : option?.label || LIBRARY_TYPE_LABELS[id] || id;
}

export function getLibraryTypeLabel(type, libraryData = {}) {
  const typeFromData = Array.isArray(libraryData.types)
    ? libraryData.types.find((item) => optionId(item) === type)
    : null;
  return typeFromData ? optionLabel(typeFromData) : LIBRARY_TYPE_LABELS[type] || type;
}

export function getLibraryStatusLabel(status) {
  return getContentStatusLabel(status);
}

export function getLibraryCounts(libraryData) {
  const items = getLibraryItems(libraryData);
  return items.reduce(
    (counts, item) => {
      counts.total += 1;
      counts.statuses[item.status] = (counts.statuses[item.status] || 0) + 1;
      counts.types[item.type] = (counts.types[item.type] || 0) + 1;
      counts.categories[item.category] = (counts.categories[item.category] || 0) + 1;
      if (!item.filePath) counts.missingFilePath += 1;
      if (!item.thumbnailPath) counts.missingThumbnailPath += 1;
      return counts;
    },
    { total: 0, missingFilePath: 0, missingThumbnailPath: 0, statuses: {}, types: {}, categories: {} }
  );
}
