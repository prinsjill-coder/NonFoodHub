import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, getContentStatusLabel } from "./content-status.js";
import { createUpdatedAtTimestamp } from "./content-dates.js";

export const BROCHURE_STATUSES = [...CONTENT_STATUSES];

export const BROCHURE_STATUS_LABELS = CONTENT_STATUS_LABELS;

export const BROCHURE_LANGUAGES = ["nl", "en"];

export const BROCHURE_LANGUAGE_LABELS = {
  nl: "Nederlands",
  en: "Engels"
};

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

export function createEmptyBrochure() {
  return {
    id: "",
    title: "",
    supplierId: "",
    slug: "",
    year: "",
    categories: [],
    pdfFile: "",
    pdfSize: "",
    thumbnail: "",
    description: "",
    language: "nl",
    status: "concept",
    sortOrder: 0,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
}

function nextYearValue(year, fallbackDate = new Date()) {
  const numericYear = Number(year);
  if (Number.isInteger(numericYear) && numericYear >= 1900 && numericYear < 2100) {
    return numericYear + 1;
  }

  return fallbackDate.getFullYear();
}

function replaceYear(value, currentYear, nextYear) {
  const source = String(value || "");
  if (!source) return "";
  if (currentYear && source.includes(String(currentYear))) {
    return source.replaceAll(String(currentYear), String(nextYear));
  }

  return `${source} ${nextYear}`.trim();
}

function replaceYearInProjectPath(value, currentYear, nextYear) {
  const source = String(value || "");
  if (!source) return "";
  if (currentYear && source.includes(String(currentYear))) {
    return source.replaceAll(String(currentYear), String(nextYear));
  }

  return source;
}

function uniqueValue(base, existingValues) {
  const normalizedBase = normalizeSlug(base) || "nieuwe-brochure";
  let candidate = normalizedBase;
  let suffix = 2;

  while (existingValues.has(candidate)) {
    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function createBrochureEditionDraft(brochure, existingBrochures = [], options = {}) {
  const source = brochure || createEmptyBrochure();
  const nextYear = options.year || nextYearValue(source.year, options.date || new Date());
  const title = replaceYear(source.title || "Nieuwe brochure", source.year, nextYear);
  const slugBase = replaceYear(source.slug || title, source.year, nextYear);
  const slug = uniqueValue(slugBase, new Set(existingBrochures.map((item) => item.slug).filter(Boolean)));
  const idBase = replaceYear(source.id || `brochure-${slug}`, source.year, nextYear);
  const id = uniqueValue(idBase, new Set(existingBrochures.map((item) => item.id).filter(Boolean)));

  return {
    ...source,
    id,
    title,
    slug,
    year: nextYear,
    pdfFile: replaceYearInProjectPath(source.pdfFile, source.year, nextYear),
    pdfSize: "",
    thumbnail: replaceYearInProjectPath(source.thumbnail, source.year, nextYear),
    status: "concept",
    updatedAt: options.updatedAt || createUpdatedAtTimestamp(options.date || new Date())
  };
}

export function getBrochures(brochureData) {
  return Array.isArray(brochureData?.items) ? brochureData.items : [];
}

export function findBrochureBySlug(brochureData, slug) {
  return getBrochures(brochureData).find((brochure) => brochure.slug === slug);
}

export function findBrochureById(brochureData, id) {
  return getBrochures(brochureData).find((brochure) => brochure.id === id);
}

export function sortBrochures(brochures) {
  return [...brochures].sort((first, second) => {
    const order = Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0);
    if (order !== 0) return order;
    return String(first.title).localeCompare(String(second.title), "nl");
  });
}

export function getBrochureStatusLabel(status) {
  return getContentStatusLabel(status);
}

export function getBrochureLanguageLabel(language, brochureData = {}) {
  const languageFromData = Array.isArray(brochureData.languages)
    ? brochureData.languages.find((item) => item.id === language)
    : null;
  return languageFromData?.label || BROCHURE_LANGUAGE_LABELS[language] || language;
}

export function getBrochureCounts(brochureData) {
  const brochures = getBrochures(brochureData);
  return brochures.reduce(
    (counts, brochure) => {
      counts.total += 1;
      counts.statuses[brochure.status] = (counts.statuses[brochure.status] || 0) + 1;
      if (brochure.pdfFile) counts.withPdf += 1;
      return counts;
    },
    { total: 0, withPdf: 0, statuses: {} }
  );
}
