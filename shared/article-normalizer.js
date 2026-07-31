import { CONTENT_STATUSES } from "./content-status.js";
import { ARTICLE_CATEGORIES, sortArticles } from "./article-model.js";

export const ARTICLES_EXPORT_FILENAME = "articles.json";

export const ARTICLE_FILE_KEYS = [
  "schemaVersion",
  "metadata",
  "prototype",
  "storage",
  "statuses",
  "categories",
  "items"
];

export const ARTICLE_KEYS = [
  "id",
  "title",
  "slug",
  "status",
  "summary",
  "body",
  "categories",
  "heroImage",
  "supplierIds",
  "brochureIds",
  "updatedAt",
  "sortOrder"
];

export const ARTICLE_STORAGE_NOTICE =
  "Kennisbankartikelen worden in browsergeheugen gewijzigd. Export downloadt alleen articles.json; vervang /data/articles.json handmatig en commit en push daarna zelf via GitHub Desktop.";

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

function latestUpdatedAt(items) {
  return items
    .map((item) => asString(item.updatedAt))
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}

function normalizeMetadata(metadata, items) {
  return {
    module: asString(metadata?.module) || "knowledge",
    source: asString(metadata?.source) || "NonFood Hub Studio",
    transfer: asString(metadata?.transfer) || "manual-json-export",
    itemCount: items.length,
    lastUpdatedAt: latestUpdatedAt(items)
  };
}

export function normalizeArticleForSession(article) {
  return {
    id: asString(article?.id),
    title: asString(article?.title),
    slug: asString(article?.slug),
    status: asString(article?.status),
    summary: asString(article?.summary),
    body: asString(article?.body),
    categories: uniqueSortedStrings(article?.categories),
    heroImage: asString(article?.heroImage),
    supplierIds: uniqueSortedStrings(article?.supplierIds),
    brochureIds: uniqueSortedStrings(article?.brochureIds),
    updatedAt: asString(article?.updatedAt),
    sortOrder: Number.isInteger(Number(article?.sortOrder)) ? Number(article.sortOrder) : 0
  };
}

export function normalizeArticleFileForSession(articleData) {
  const items = sortArticles(Array.isArray(articleData?.items) ? articleData.items : []).map(normalizeArticleForSession);

  return {
    schemaVersion: asString(articleData?.schemaVersion) || "0.1.0",
    metadata: normalizeMetadata(articleData?.metadata, items),
    prototype: true,
    storage: {
      mode: "static-import-export",
      writeEnabled: false,
      message: ARTICLE_STORAGE_NOTICE
    },
    statuses: Array.isArray(articleData?.statuses) && articleData.statuses.length ? articleData.statuses : CONTENT_STATUSES,
    categories:
      Array.isArray(articleData?.categories) && articleData.categories.length
        ? uniqueSortedStrings(articleData.categories)
        : ARTICLE_CATEGORIES,
    items
  };
}

export function normalizeArticleFileForExport(articleData) {
  return normalizeArticleFileForSession(articleData);
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

export function stringifyArticleExport(articleData) {
  return `${JSON.stringify(normalizeArticleFileForExport(articleData), null, 2)}\n`;
}
