import { CONTENT_STATUSES } from "./content-status.js";
import { LIBRARY_CATEGORIES, LIBRARY_TYPES, sortLibraryItems } from "./library-model.js";

export const LIBRARY_EXPORT_FILENAME = "library.json";

export const LIBRARY_FILE_KEYS = [
  "schemaVersion",
  "metadata",
  "prototype",
  "storage",
  "statuses",
  "types",
  "categories",
  "items"
];

export const LIBRARY_ITEM_KEYS = [
  "id",
  "title",
  "slug",
  "status",
  "type",
  "category",
  "summary",
  "filePath",
  "thumbnailPath",
  "supplierIds",
  "brochureIds",
  "articleIds",
  "tags",
  "updatedAt",
  "sortOrder"
];

export const LIBRARY_STORAGE_NOTICE =
  "Bibliotheekitems worden in de bewerkversie aangepast. Gebruik Gegevens exporteren om het beheerbestand handmatig over te dragen.";

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asString(value) {
  return String(value ?? "").trim();
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) return [];
  return values.map(asString).filter(Boolean);
}

function uniqueStrings(values) {
  const seen = new Set();
  return normalizeStringList(values).filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function latestUpdatedAt(items) {
  return items
    .map((item) => asString(item.updatedAt))
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}

function normalizeMetadata(metadata, items) {
  return {
    module: asString(metadata?.module) || "library",
    source: asString(metadata?.source) || "NonFood Hub Studio",
    transfer: asString(metadata?.transfer) || "manual-json-export",
    itemCount: items.length,
    lastUpdatedAt: latestUpdatedAt(items)
  };
}

export function normalizeLibraryItemForSession(item) {
  return {
    id: asString(item?.id),
    title: asString(item?.title),
    slug: asString(item?.slug),
    status: asString(item?.status),
    type: asString(item?.type),
    category: asString(item?.category),
    summary: asString(item?.summary),
    filePath: asString(item?.filePath),
    thumbnailPath: asString(item?.thumbnailPath),
    supplierIds: uniqueStrings(item?.supplierIds),
    brochureIds: uniqueStrings(item?.brochureIds),
    articleIds: uniqueStrings(item?.articleIds),
    tags: uniqueStrings(item?.tags),
    updatedAt: asString(item?.updatedAt),
    sortOrder: Number.isInteger(Number(item?.sortOrder)) ? Number(item.sortOrder) : 0
  };
}

export function normalizeLibraryFileForSession(libraryData) {
  const items = sortLibraryItems(Array.isArray(libraryData?.items) ? libraryData.items : []).map(normalizeLibraryItemForSession);

  return {
    schemaVersion: asString(libraryData?.schemaVersion) || "0.1.0",
    metadata: normalizeMetadata(libraryData?.metadata, items),
    prototype: true,
    storage: {
      mode: "static-import-export",
      writeEnabled: false,
      message: LIBRARY_STORAGE_NOTICE
    },
    statuses: Array.isArray(libraryData?.statuses) && libraryData.statuses.length ? libraryData.statuses : CONTENT_STATUSES,
    types: Array.isArray(libraryData?.types) && libraryData.types.length ? uniqueStrings(libraryData.types) : LIBRARY_TYPES,
    categories: Array.isArray(libraryData?.categories) && libraryData.categories.length
      ? uniqueStrings(libraryData.categories)
      : LIBRARY_CATEGORIES,
    items
  };
}

export function normalizeLibraryFileForExport(libraryData) {
  return normalizeLibraryFileForSession(libraryData);
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function stringifyLibraryExport(libraryData) {
  return `${JSON.stringify(normalizeLibraryFileForExport(libraryData), null, 2)}\n`;
}
