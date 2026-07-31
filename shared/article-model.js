import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, getContentStatusLabel } from "./content-status.js";

export const ARTICLE_STATUSES = [...CONTENT_STATUSES];

export const ARTICLE_STATUS_LABELS = CONTENT_STATUS_LABELS;

export const ARTICLE_CATEGORIES = [
  "Inspiratie",
  "Terras & Outdoor",
  "Tafelpresentatie",
  "Buffet & presentatie",
  "Gastbeleving",
  "Koffie & dranken",
  "Trends"
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

export function createEmptyArticle() {
  return {
    id: "",
    title: "",
    slug: "",
    status: "concept",
    summary: "",
    body: "",
    categories: [],
    heroImage: "",
    supplierIds: [],
    brochureIds: [],
    updatedAt: new Date().toISOString().slice(0, 10),
    sortOrder: 0
  };
}

export function getArticles(articleData) {
  return Array.isArray(articleData?.items) ? articleData.items : [];
}

export function findArticleBySlug(articleData, slug) {
  return getArticles(articleData).find((article) => article.slug === slug);
}

export function findArticleById(articleData, id) {
  return getArticles(articleData).find((article) => article.id === id);
}

export function sortArticles(articles) {
  return [...articles].sort((first, second) => {
    const order = Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0);
    if (order !== 0) return order;
    return String(first.title).localeCompare(String(second.title), "nl");
  });
}

export function getArticleStatusLabel(status) {
  return getContentStatusLabel(status);
}

export function getArticleCounts(articleData) {
  const articles = getArticles(articleData);
  return articles.reduce(
    (counts, article) => {
      counts.total += 1;
      counts.statuses[article.status] = (counts.statuses[article.status] || 0) + 1;
      if (!article.heroImage) counts.missingHeroImage += 1;
      return counts;
    },
    { total: 0, missingHeroImage: 0, statuses: {} }
  );
}
