import { SUPPLIER_STATUSES, SUPPLIER_TYPES, normalizeSlug, sortSuppliers } from "./supplier-model.js";

export const SUPPLIERS_EXPORT_FILENAME = "suppliers.json";

export const SUPPLIER_FILE_KEYS = ["schemaVersion", "prototype", "storage", "statuses", "types", "categories", "items"];

export const SUPPLIER_KEYS = [
  "id",
  "name",
  "slug",
  "type",
  "summary",
  "description",
  "categories",
  "logo",
  "image",
  "brochureIds",
  "relatedArticleIds",
  "featured",
  "sortOrder",
  "status"
];

export const SUPPLIER_STORAGE_NOTICE =
  "Leveranciers worden in Sprint 3 in browsergeheugen gewijzigd. Export downloadt alleen suppliers.json; vervang /data/suppliers.json handmatig en commit en push daarna zelf via GitHub Desktop.";

const DEFAULT_TYPE_LABELS = {
  leverancier: "Leverancier",
  partner: "Partner",
  servicepartner: "Servicepartner"
};

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asString(value) {
  return String(value ?? "").trim();
}

function uniqueSortedStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(asString).filter(Boolean))].sort((first, second) =>
    first.localeCompare(second, "nl")
  );
}

function normalizeType(type) {
  const id = asString(typeof type === "string" ? type : type?.id);
  return {
    id,
    label: asString(type?.label) || DEFAULT_TYPE_LABELS[id] || id
  };
}

function normalizeTypes(types) {
  const sourceTypes = Array.isArray(types) && types.length ? types : SUPPLIER_TYPES;
  const mapped = sourceTypes.map(normalizeType).filter((type) => type.id);
  const seen = new Set();
  return mapped.filter((type) => {
    if (seen.has(type.id)) return false;
    seen.add(type.id);
    return true;
  });
}

export function normalizeSupplierForExport(supplier) {
  return {
    id: asString(supplier?.id),
    name: asString(supplier?.name),
    slug: normalizeSlug(supplier?.slug),
    type: asString(supplier?.type),
    summary: asString(supplier?.summary),
    description: asString(supplier?.description),
    categories: uniqueSortedStrings(supplier?.categories),
    logo: asString(supplier?.logo),
    image: asString(supplier?.image),
    brochureIds: uniqueSortedStrings(supplier?.brochureIds),
    relatedArticleIds: uniqueSortedStrings(supplier?.relatedArticleIds),
    featured: Boolean(supplier?.featured),
    sortOrder: Number.isInteger(Number(supplier?.sortOrder)) ? Number(supplier.sortOrder) : 0,
    status: asString(supplier?.status)
  };
}

export function normalizeSupplierFileForExport(supplierData) {
  const items = sortSuppliers(Array.isArray(supplierData?.items) ? supplierData.items : []).map(normalizeSupplierForExport);

  return {
    schemaVersion: asString(supplierData?.schemaVersion) || "0.1.0",
    prototype: true,
    storage: {
      mode: "static-import-export",
      writeEnabled: false,
      message: SUPPLIER_STORAGE_NOTICE
    },
    statuses: Array.isArray(supplierData?.statuses) && supplierData.statuses.length ? supplierData.statuses : SUPPLIER_STATUSES,
    types: normalizeTypes(supplierData?.types),
    categories: uniqueSortedStrings(supplierData?.categories),
    items
  };
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

export function stringifySupplierExport(supplierData) {
  return `${JSON.stringify(normalizeSupplierFileForExport(supplierData), null, 2)}\n`;
}

