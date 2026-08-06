import { CONTENT_STATUSES, normalizeContentStatus } from "./content-status.js";
import { BROCHURE_LANGUAGES, normalizeSlug, sortBrochures } from "./brochure-model.js";

export const BROCHURES_EXPORT_FILENAME = "brochures.json";

export const BROCHURE_FILE_KEYS = ["schemaVersion", "prototype", "storage", "statuses", "categories", "languages", "items"];

export const BROCHURE_KEYS = [
  "id",
  "title",
  "supplierId",
  "slug",
  "year",
  "categories",
  "pdfFile",
  "pdfSize",
  "thumbnail",
  "description",
  "language",
  "status",
  "sortOrder",
  "updatedAt"
];

export const BROCHURE_STORAGE_NOTICE =
  "Brochures worden in de bewerkversie aangepast. Gebruik Gegevens exporteren, plaats PDF en afbeelding op de afgesproken plek en gebruik daarna Website bijwerken.";

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

function normalizeLanguage(language) {
  const id = asString(typeof language === "string" ? language : language?.id);
  return {
    id,
    label: asString(language?.label) || id
  };
}

function normalizeLanguages(languages) {
  const sourceLanguages = Array.isArray(languages) && languages.length ? languages : BROCHURE_LANGUAGES;
  const mapped = sourceLanguages.map(normalizeLanguage).filter((language) => language.id);
  const seen = new Set();
  return mapped.filter((language) => {
    if (seen.has(language.id)) return false;
    seen.add(language.id);
    return true;
  });
}

function normalizeYear(value) {
  if (value === "" || value === null || typeof value === "undefined") return "";
  const year = Number(value);
  return Number.isInteger(year) ? year : value;
}

export function normalizeBrochureForExport(brochure) {
  return {
    id: asString(brochure?.id),
    title: asString(brochure?.title),
    supplierId: asString(brochure?.supplierId),
    slug: normalizeSlug(brochure?.slug),
    year: normalizeYear(brochure?.year),
    categories: uniqueSortedStrings(brochure?.categories),
    pdfFile: asString(brochure?.pdfFile),
    pdfSize: asString(brochure?.pdfSize),
    thumbnail: asString(brochure?.thumbnail),
    description: asString(brochure?.description),
    language: asString(brochure?.language),
    status: normalizeContentStatus(brochure?.status),
    sortOrder: Number.isInteger(Number(brochure?.sortOrder)) ? Number(brochure.sortOrder) : 0,
    updatedAt: asString(brochure?.updatedAt)
  };
}

export function normalizeBrochureFileForSession(brochureData) {
  const items = sortBrochures(Array.isArray(brochureData?.items) ? brochureData.items : []).map(normalizeBrochureForExport);

  return {
    schemaVersion: asString(brochureData?.schemaVersion) || "0.1.0",
    prototype: true,
    storage: {
      mode: "static-import-export",
      writeEnabled: false,
      message: BROCHURE_STORAGE_NOTICE
    },
    statuses: CONTENT_STATUSES,
    categories: uniqueSortedStrings(brochureData?.categories),
    languages: normalizeLanguages(brochureData?.languages),
    items
  };
}

export function normalizeBrochureFileForExport(brochureData) {
  return normalizeBrochureFileForSession(brochureData);
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

export function stringifyBrochureExport(brochureData) {
  return `${JSON.stringify(normalizeBrochureFileForExport(brochureData), null, 2)}\n`;
}
