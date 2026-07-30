import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, getContentStatusLabel } from "./content-status.js";

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
